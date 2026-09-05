import type { RealtimeChannel } from '@supabase/supabase-js'
import { ApiError, check, client, currentUserId, functionErrorMessage, unwrap } from './client'
import type { EntryType, Lesson, Tutor } from './types'

export type LessonTutor = Pick<Tutor, 'name' | 'language'>

export interface LessonWithTutor extends Lesson {
  tutor: LessonTutor | null
}

export type EntryCounts = Record<EntryType, number>

export interface LessonListItem extends LessonWithTutor {
  entryCount: number
  counts: EntryCounts
}

const WITH_TUTOR = '*, tutor:tutors(name, language)'

interface ListRow extends LessonWithTutor {
  entries: { type: EntryType }[] | null
}

export async function listLessons(): Promise<LessonListItem[]> {
  const result = await client()
    .from('lessons')
    .select(`${WITH_TUTOR}, entries(type)`)
    .is('entries.deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  const rows = unwrap<ListRow[]>(result, 'loadLessons')
  return rows.map(({ entries, ...lesson }) => {
    const counts: EntryCounts = { correction: 0, vocab: 0, rule: 0 }
    for (const e of entries ?? []) counts[e.type] += 1
    return { ...lesson, entryCount: entries?.length ?? 0, counts }
  })
}

export async function getLesson(id: string): Promise<LessonWithTutor> {
  const result = await client().from('lessons').select(WITH_TUTOR).eq('id', id).single()
  return unwrap<LessonWithTutor>(result, 'loadLesson')
}

export async function createLesson({ tutorId, date }: { tutorId: string; date: string }): Promise<Lesson> {
  const result = await client().from('lessons').insert({ tutor_id: tutorId, date }).select('*').single()
  return unwrap<Lesson>(result, 'createLesson')
}

export async function requestTranscription(lessonId: string): Promise<void> {
  const { error } = await client().functions.invoke('ll-transcribe', { body: { lessonId } })
  if (error) throw new ApiError('transcribe', await functionErrorMessage(error))
}

export async function uploadAudio(lessonId: string, file: File): Promise<void> {
  const c = client()
  const userId = await currentUserId()
  const path = `${userId}/${lessonId}.m4a`
  const upload = await c.storage.from('audio').upload(path, file, { contentType: file.type || 'audio/mp4', upsert: true })
  check(upload, 'uploadFile')
  check(await c.from('lessons').update({ audio_path: path }).eq('id', lessonId), 'saveAudioPath')
  await requestTranscription(lessonId)
}

export function subscribeLessons(onChange: (lesson: Lesson) => void): () => void {
  const c = client()
  let channel: RealtimeChannel | null = null
  let cancelled = false
  void currentUserId()
    .then((userId) => {
      if (cancelled) return
      channel = c
        .channel(`lessons:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'lesson_log', table: 'lessons', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType !== 'DELETE') onChange(payload.new as Lesson)
          },
        )
        .subscribe()
    })
    .catch(() => {})
  return () => {
    cancelled = true
    if (channel) void c.removeChannel(channel)
  }
}
