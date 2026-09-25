import { fsrs, Grades, type Card, type Grade, type State } from 'ts-fsrs'
import type { Translate } from '@/i18n/types'
import { ApiError, check, client, unwrap } from './client'
import { one } from './relations'
import type { CardRow, EntryType, TutorLanguage } from './types'

export type { Grade }
export { Grades }

export interface DueCardEntry {
  id: string
  type: EntryType
  original: string
  corrected: string | null
  explanation: string | null
  quote: string | null
  lang: TutorLanguage | null
  lesson: { date: string; tutor: { name: string; language: TutorLanguage } | null } | null
}

export interface DueCard extends CardRow {
  entry: DueCardEntry
}

export interface DeckStats {
  due: number
  new: number
  total: number
}

const DUE_SELECT =
  '*, entry:entries!inner(id, type, original, corrected, explanation, quote, lang, deleted_at, lesson:lessons(date, tutor:tutors(name, language)))'

interface DueRow extends CardRow {
  entry: Omit<DueCardEntry, 'lesson'> & { deleted_at: string | null; lesson: DueCardEntry['lesson'] | DueCardEntry['lesson'][] }
}

export const NEW_PER_DAY = 20

export type DeckLang = TutorLanguage | 'all'
type Bucket = TutorLanguage | null

// Each language has its own daily new-card quota, like separate decks in Anki; 'all' sums them.
const BUCKETS: Bucket[] = ['pl', 'en', null]

function bucketsFor(lang: DeckLang): Bucket[] {
  return lang === 'all' ? BUCKETS : [lang]
}

export function startOfLocalDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

const COUNT_SELECT = 'entry_id, entry:entries!inner(lang)'

function countCards() {
  return client().from('cards').select(COUNT_SELECT, { count: 'exact', head: true })
}

function dueCards(now: Date) {
  return client().from('cards').select(DUE_SELECT).lte('due', now.toISOString()).is('entry.deleted_at', null).order('due')
}

type CountQuery = ReturnType<typeof countCards>
type DueQuery = ReturnType<typeof dueCards>

function countIn(query: CountQuery, bucket: Bucket | 'all'): CountQuery {
  if (bucket === 'all') return query
  return bucket === null ? query.is('entry.lang', null) : query.eq('entry.lang', bucket)
}

function dueIn(query: DueQuery, bucket: Bucket | 'all'): DueQuery {
  if (bucket === 'all') return query
  return bucket === null ? query.is('entry.lang', null) : query.eq('entry.lang', bucket)
}

async function introducedToday(bucket: Bucket, now: Date): Promise<number> {
  return counted(await countIn(countCards().gte('first_review_at', startOfLocalDay(now).toISOString()), bucket))
}

function flatten(rows: DueRow[]): DueCard[] {
  return rows.map(({ entry: { deleted_at: _deleted, lesson, ...entry }, ...card }) => ({
    ...card,
    entry: { ...entry, lesson: one(lesson) },
  }))
}

export async function listDueCards(limit = 50, now = new Date(), lang: DeckLang = 'all'): Promise<DueCard[]> {
  const buckets = bucketsFor(lang)
  const quotas = await Promise.all(buckets.map(async (b) => Math.max(0, NEW_PER_DAY - (await introducedToday(b, now)))))
  const [reviews, ...fresh] = await Promise.all([
    dueIn(dueCards(now).gt('state', 0), lang).limit(limit),
    ...buckets.map((b, i) =>
      quotas[i] > 0 ? dueIn(dueCards(now).eq('state', 0), b).limit(Math.min(quotas[i], limit)) : Promise.resolve({ data: [] as DueRow[], error: null }),
    ),
  ])
  const rows = [reviews, ...fresh].flatMap((r) => unwrap<DueRow[]>(r, 'loadCards'))
  return flatten(rows)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
    .slice(0, limit)
}

const scheduler = fsrs()

export function toFsrsCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

export type CardPatch = Omit<CardRow, 'entry_id' | 'user_id'>

export function scheduleCard(row: CardRow, grade: Grade, now = new Date()): CardPatch {
  const next = scheduler.repeat(toFsrsCard(row), now)[grade].card
  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    learning_steps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state as CardRow['state'],
    last_review: (next.last_review ?? now).toISOString(),
    first_review_at: row.first_review_at ?? (row.state === 0 ? now.toISOString() : null),
  }
}

// Like Anki's learn-ahead limit: a card due again within this window comes back in the same session.
export const LEARN_AHEAD_MS = 20 * 60_000

export function requeue<T extends CardRow>(rest: T[], graded: T, now = new Date()): T[] {
  if (new Date(graded.due).getTime() - now.getTime() > LEARN_AHEAD_MS) return rest
  const at = rest.findIndex((c) => c.due > graded.due)
  return at === -1 ? [...rest, graded] : [...rest.slice(0, at), graded, ...rest.slice(at)]
}

export async function reviewCard<T extends CardRow>(card: T, grade: Grade, now = new Date()): Promise<T> {
  const patch = scheduleCard(card, grade, now)
  check(await client().from('cards').update(patch).eq('entry_id', card.entry_id), 'saveReview')
  return { ...card, ...patch }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatInterval(ms: number, t: Translate): string {
  if (ms < MINUTE) return t('interval.lt1m')
  if (ms < HOUR) return t('interval.m', { n: Math.round(ms / MINUTE) })
  if (ms < DAY) return t('interval.h', { n: Math.round(ms / HOUR) })
  const days = Math.round(ms / DAY)
  if (days < 30) return t('interval.d', { n: days })
  if (days < 365) return t('interval.mo', { n: Math.round(days / 30) })
  return t('interval.y', { n: Math.round(days / 36.5) / 10 })
}

export function previewIntervals(row: CardRow, t: Translate, now = new Date()): Record<Grade, string> {
  const log = scheduler.repeat(toFsrsCard(row), now)
  const out = {} as Record<Grade, string>
  for (const grade of Grades) out[grade] = formatInterval(log[grade].card.due.getTime() - now.getTime(), t)
  return out
}

export async function addToDeck(entryId: string): Promise<void> {
  check(await client().from('cards').insert({ entry_id: entryId }), 'addToDeck')
}

export async function removeFromDeck(entryId: string): Promise<void> {
  check(await client().from('cards').delete().eq('entry_id', entryId), 'removeFromDeck')
}

function counted(result: { count: number | null; error: { message: string } | null }): number {
  if (result.error) throw new ApiError('countCards', result.error.message)
  return result.count ?? 0
}

export async function deckStats(now = new Date(), lang: DeckLang = 'all'): Promise<DeckStats> {
  const at = now.toISOString()
  const buckets = bucketsFor(lang)
  const [reviewsDue, total, ...perBucket] = await Promise.all([
    countIn(countCards().gt('state', 0).lte('due', at), lang).then(counted),
    countIn(countCards(), lang).then(counted),
    ...buckets.map(async (b) => {
      const [newDue, introduced] = await Promise.all([
        countIn(countCards().eq('state', 0).lte('due', at), b).then(counted),
        introducedToday(b, now),
      ])
      return Math.min(newDue, Math.max(0, NEW_PER_DAY - introduced))
    }),
  ])
  const fresh = perBucket.reduce((sum, n) => sum + n, 0)
  return { due: reviewsDue + fresh, new: fresh, total }
}
