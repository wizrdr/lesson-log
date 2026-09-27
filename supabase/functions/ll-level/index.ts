import { authenticate, orThrow, serviceClient } from '../_shared/auth.ts'
import { corsHeaders, json, readJson } from '../_shared/http.ts'
import { parseLevelDoc } from '../_shared/level-input.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const db = serviceClient()
  try {
    const userId = await authenticate(db, req)
    if (!userId) return json(req, 401, { error: 'unauthorized' })
    const parsed = parseLevelDoc(await readJson(req))
    if (!parsed.ok) return json(req, 400, { error: parsed.error })
    orThrow(
      await db.from('level_profiles').upsert({ user_id: userId, doc: parsed.value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      'level upsert failed',
    )
    const d = parsed.value
    return json(req, 200, { tests: d.tests.length, topics: d.topics.length, checkpoints: d.checkpoints.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('ll-level', message)
    return json(req, 500, { error: message })
  }
})
