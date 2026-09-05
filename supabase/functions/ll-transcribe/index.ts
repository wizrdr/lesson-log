import { createClient } from '@supabase/supabase-js'
import type { Lesson } from '../../../src/api/types.ts'
import { corsHeaders, env, json, readJson } from '../_shared/http.ts'

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen'
const SIGNED_URL_TTL_SEC = 2 * 60 * 60

type LessonRow = Pick<Lesson, 'id' | 'user_id' | 'status' | 'audio_path'>

function serviceClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    db: { schema: 'lesson_log' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function deepgramRequestUrl(lessonId: string): URL {
  const callback = new URL(`${env('SUPABASE_URL')}/functions/v1/ll-extract`)
  callback.searchParams.set('lesson', lessonId)
  callback.searchParams.set('token', env('CALLBACK_TOKEN'))

  const url = new URL(DEEPGRAM_URL)
  url.searchParams.set('model', 'nova-3')
  url.searchParams.set('language', 'multi')
  url.searchParams.set('smart_format', 'true')
  url.searchParams.set('punctuate', 'true')
  url.searchParams.set('diarize', 'true')
  url.searchParams.set('utterances', 'true')
  url.searchParams.set('callback', callback.toString())
  return url
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json(req, 401, { error: 'unauthorized' })

  const db = serviceClient()
  const { data: userData, error: userError } = await db.auth.getUser(jwt)
  if (userError || !userData.user) return json(req, 401, { error: 'unauthorized' })

  const body = await readJson(req)
  const lessonId = body.lessonId
  if (typeof lessonId !== 'string' || lessonId.length === 0) return json(req, 400, { error: 'lessonId required' })

  const { data: lesson, error: lessonError } = await db
    .from('lessons')
    .select('id, user_id, status, audio_path')
    .eq('id', lessonId)
    .maybeSingle<LessonRow>()
  if (lessonError) return json(req, 500, { error: 'lesson lookup failed' })
  if (!lesson || lesson.user_id !== userData.user.id) return json(req, 404, { error: 'lesson not found' })
  if (lesson.status !== 'uploaded' && lesson.status !== 'failed') return json(req, 409, { error: `lesson is ${lesson.status}` })
  if (!lesson.audio_path) return json(req, 400, { error: 'lesson has no audio' })

  const { data: signed, error: signError } = await db.storage
    .from('audio')
    .createSignedUrl(lesson.audio_path, SIGNED_URL_TTL_SEC)
  if (signError || !signed) return json(req, 500, { error: 'signed url failed' })

  const res = await fetch(deepgramRequestUrl(lesson.id), {
    method: 'POST',
    headers: { Authorization: `Token ${env('DEEPGRAM_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: signed.signedUrl }),
  })
  if (!res.ok) {
    const message = `Deepgram ${res.status}: ${(await res.text()).slice(0, 500)}`
    await db.from('lessons').update({ status: 'failed', error: message }).eq('id', lesson.id)
    console.error('ll-transcribe', lesson.id, message)
    return json(req, 502, { error: message })
  }

  const { request_id } = (await res.json()) as { request_id?: string }
  const { error: updateError } = await db
    .from('lessons')
    .update({ status: 'transcribing', error: null, transcription_request_id: request_id ?? null })
    .eq('id', lesson.id)
  if (updateError) return json(req, 500, { error: 'lesson update failed' })

  return json(req, 200, { ok: true })
})
