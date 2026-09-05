import { createClient } from '@supabase/supabase-js'
import type { Lesson } from '../../../src/api/types.ts'
import { validCallbackToken } from '../_shared/callback-token.ts'
import { type DeepgramResponse, deepgramError, deepgramText } from '../_shared/deepgram.ts'
import { claudeCaller, extractItems } from '../_shared/extract.ts'
import type { ExtractedItem } from '../_shared/extract-schema.ts'
import { env, json } from '../_shared/http.ts'

type LessonRow = Pick<Lesson, 'id' | 'user_id' | 'status' | 'audio_path'>
type Db = ReturnType<typeof serviceClient>

function serviceClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    db: { schema: 'lesson_log' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function orThrow<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data
}

async function setStatus(db: Db, lessonId: string, patch: Partial<Lesson>): Promise<void> {
  orThrow(await db.from('lessons').update(patch).eq('id', lessonId), 'lesson update failed')
}

async function saveEntries(db: Db, lesson: LessonRow, items: ExtractedItem[]): Promise<number> {
  if (items.length === 0) return 0
  const rows = items.map((it) => ({
    lesson_id: lesson.id,
    user_id: lesson.user_id,
    type: it.type,
    original: it.original,
    corrected: it.corrected || null,
    explanation: it.explanation || null,
    quote: it.quote || null,
  }))
  const entries = orThrow(await db.from('entries').insert(rows).select('id'), 'entries insert failed') as { id: string }[]
  const cards = entries.map((e) => ({ entry_id: e.id, user_id: lesson.user_id }))
  orThrow(await db.from('cards').insert(cards), 'cards insert failed')
  return entries.length
}

async function process(db: Db, lesson: LessonRow, transcript: string): Promise<number> {
  await setStatus(db, lesson.id, { transcript, status: 'extracting', error: null })
  const items = await extractItems(transcript, claudeCaller(env('ANTHROPIC_API_KEY')))
  const count = await saveEntries(db, lesson, items)
  if (lesson.audio_path) {
    const { error } = await db.storage.from('audio').remove([lesson.audio_path])
    if (error) throw new Error(`audio delete failed: ${error.message}`)
  }
  await setStatus(db, lesson.id, { audio_path: null, status: 'ready' })
  return count
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })
  const url = new URL(req.url)
  if (!validCallbackToken(url, Deno.env.get('CALLBACK_TOKEN') ?? '')) return json(req, 401, { error: 'unauthorized' })
  const lessonId = url.searchParams.get('lesson')
  if (!lessonId) return json(req, 400, { error: 'lesson required' })

  const db = serviceClient()
  const { data: lesson, error: lessonError } = await db
    .from('lessons')
    .select('id, user_id, status, audio_path')
    .eq('id', lessonId)
    .maybeSingle<LessonRow>()
  if (lessonError) return json(req, 500, { error: 'lesson lookup failed' })
  if (!lesson) return json(req, 404, { error: 'lesson not found' })
  if (lesson.status === 'ready' || lesson.status === 'extracting') return json(req, 200, { ok: true, skipped: lesson.status })

  let body: DeepgramResponse
  try {
    body = (await req.json()) as DeepgramResponse
  } catch {
    body = {}
  }

  const fail = async (message: string) => {
    console.error('ll-extract', lesson.id, message)
    await db.from('lessons').update({ status: 'failed', error: message }).eq('id', lesson.id)
    return json(req, 200, { ok: false, error: message })
  }

  const upstream = deepgramError(body)
  if (upstream) return fail(`Deepgram: ${upstream}`)

  try {
    const entries = await process(db, lesson, deepgramText(body))
    return json(req, 200, { ok: true, entries })
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
})
