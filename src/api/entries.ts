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
