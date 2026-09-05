import { client, unwrap } from './client'
import type { Entry } from './types'

export async function listEntriesByLesson(lessonId: string): Promise<Entry[]> {
  const result = await client()
    .from('entries')
    .select('*')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('created_at')
  return unwrap<Entry[]>(result, 'Не удалось загрузить записи')
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
    if (!row.corrected) continue
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
  return groupRecurringCorrections(unwrap<CorrectionRow[]>(result, 'Не удалось загрузить исправления'))
}
