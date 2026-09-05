import { check, client, unwrap } from './client'
import { removeFromDeck } from './cards'
import { one } from './relations'
import type { Entry, EntryType, TutorLanguage } from './types'

export interface EntryLesson {
  id: string
  date: string
  tutor: { name: string; language: TutorLanguage } | null
}

export interface LessonEntry extends Entry {
  card: { due: string } | null
}

export interface JournalEntry extends Entry {
  inDeck: boolean
  lesson: EntryLesson | null
}

type Rel<T> = T | T[] | null

export async function listEntriesByLesson(lessonId: string): Promise<LessonEntry[]> {
  const result = await client()
    .from('entries')
    .select('*, card:cards(due)')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('created_at')
  return unwrap<(Entry & { card: Rel<{ due: string }> })[]>(result, 'loadEntries').map((row) => ({ ...row, card: one(row.card) }))
}

export interface ListEntriesFilter {
  type?: EntryType
  tutorId?: string
  search?: string
}

interface JournalRow extends Entry {
  card: Rel<{ entry_id: string }>
  lesson: Rel<EntryLesson & { tutor: Rel<EntryLesson['tutor']> }>
}

function quote(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`
}

export async function listEntries({ type, tutorId, search }: ListEntriesFilter = {}): Promise<JournalEntry[]> {
  const lessonJoin = tutorId ? 'lessons!inner' : 'lessons'
  let query = client()
    .from('entries')
    .select(`*, card:cards(entry_id), lesson:${lessonJoin}(id, date, tutor:tutors(name, language))`)
    .is('deleted_at', null)
  if (type) query = query.eq('type', type)
  if (tutorId) query = query.eq('lesson.tutor_id', tutorId)
  const term = search?.trim()
  if (term) {
    const pattern = quote(`%${term}%`)
    query = query.or(`original.ilike.${pattern},corrected.ilike.${pattern}`)
  }
  const result = await query.order('created_at', { ascending: false })
  return unwrap<JournalRow[]>(result, 'loadEntries').map(({ card, lesson, ...entry }) => {
    const l = one(lesson)
    return { ...entry, inDeck: one(card) !== null, lesson: l ? { ...l, tutor: one(l.tutor) } : null }
  })
}

export interface EntryInput {
  type: EntryType
  original: string
  corrected: string | null
  explanation: string | null
}

function clean(input: EntryInput): EntryInput {
  return {
    type: input.type,
    original: input.original.trim(),
    corrected: input.corrected?.trim() || null,
    explanation: input.explanation?.trim() || null,
  }
}

export async function createManualEntry(input: EntryInput): Promise<JournalEntry> {
  const c = client()
  const entry = unwrap<Entry>(await c.from('entries').insert({ ...clean(input), lesson_id: null }).select('*').single(), 'saveEntry')
  check(await c.from('cards').insert({ entry_id: entry.id }), 'addToDeck')
  return { ...entry, inDeck: true, lesson: null }
}

export async function updateEntry(id: string, input: EntryInput): Promise<Entry> {
  const result = await client().from('entries').update(clean(input)).eq('id', id).select('*').single()
  return unwrap<Entry>(result, 'saveEntry')
}

export async function softDeleteEntry(id: string): Promise<void> {
  await removeFromDeck(id)
  check(await client().from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'deleteEntry')
}

export type CorrectionRow = Pick<Entry, 'lesson_id' | 'original' | 'corrected'>

export interface RecurringCorrection {
  original: string
  corrected: string
  lessonCount: number
}

export function groupRecurringCorrections(rows: CorrectionRow[], minLessons = 2): RecurringCorrection[] {
  const groups = new Map<string, { original: string; corrected: string; lessons: Set<string> }>()
  for (const row of rows) {
    if (!row.corrected || !row.lesson_id) continue
    const key = row.corrected.trim().toLowerCase()
    if (!key) continue
    const group = groups.get(key)
    if (group) group.lessons.add(row.lesson_id)
    else groups.set(key, { original: row.original, corrected: row.corrected.trim(), lessons: new Set([row.lesson_id]) })
  }
  return [...groups.values()]
    .filter((g) => g.lessons.size >= minLessons)
    .sort((a, b) => b.lessons.size - a.lessons.size)
    .map((g) => ({ original: g.original, corrected: g.corrected, lessonCount: g.lessons.size }))
}

export async function listRecurringCorrections(): Promise<RecurringCorrection[]> {
  const result = await client()
    .from('entries')
    .select('lesson_id, original, corrected')
    .eq('type', 'correction')
    .is('deleted_at', null)
    .not('corrected', 'is', null)
    .order('created_at', { ascending: false })
  return groupRecurringCorrections(unwrap<CorrectionRow[]>(result, 'loadCorrections'))
}
