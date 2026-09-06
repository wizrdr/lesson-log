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

export async function listDueCards(limit = 50): Promise<DueCard[]> {
  const result = await client()
    .from('cards')
    .select(DUE_SELECT)
    .lte('due', new Date().toISOString())
    .is('entry.deleted_at', null)
    .order('due')
    .limit(limit)
  return unwrap<DueRow[]>(result, 'loadCards').map(({ entry: { deleted_at: _deleted, lesson, ...entry }, ...card }) => ({
    ...card,
    entry: { ...entry, lesson: one(lesson) },
  }))
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
  }
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

export async function deckStats(): Promise<DeckStats> {
  const cards = () => client().from('cards').select('entry_id', { count: 'exact', head: true })
  const [due, fresh, total] = await Promise.all([
    cards().lte('due', new Date().toISOString()).then(counted),
    cards().eq('state', 0).then(counted),
    cards().then(counted),
  ])
  return { due, new: fresh, total }
}
