import { createClient } from '@supabase/supabase-js'
import { hashKey, isApiKey } from './api-key.ts'
import { env } from './http.ts'

export type Db = ReturnType<typeof serviceClient>

export function serviceClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    db: { schema: 'lesson_log' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function orThrow<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data
}

async function userFromApiKey(db: Db, key: string): Promise<string | null> {
  const { data, error } = await db
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', await hashKey(key))
    .is('revoked_at', null)
    .maybeSingle<{ id: string; user_id: string }>()
  if (error) throw new Error(`api key lookup failed: ${error.message}`)
  if (!data) return null
  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return data.user_id
}

async function userFromJwt(db: Db, jwt: string): Promise<string | null> {
  const { data, error } = await db.auth.getUser(jwt)
  return error || !data.user ? null : data.user.id
}

export async function authenticate(db: Db, req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  return isApiKey(token) ? userFromApiKey(db, token) : userFromJwt(db, token)
}
