import { API_KEY_HEX_LENGTH, API_KEY_PREFIX, hashKey, keyPrefix, toHex } from '../../supabase/functions/_shared/api-key.ts'
import { check, client, unwrap } from './client'
import type { ApiKey } from './types'

export { API_KEY_PREFIX, hashKey, keyPrefix }

export interface GeneratedKey {
  key: string
  key_hash: string
  key_prefix: string
}

export async function generateKey(): Promise<GeneratedKey> {
  const key = API_KEY_PREFIX + toHex(crypto.getRandomValues(new Uint8Array(API_KEY_HEX_LENGTH / 2)))
  return { key, key_hash: await hashKey(key), key_prefix: keyPrefix(key) }
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const result = await client().from('api_keys').select('*').is('revoked_at', null).order('created_at', { ascending: false })
  return unwrap<ApiKey[]>(result, 'loadApiKeys')
}

export async function createApiKey(label: string): Promise<{ key: string; row: ApiKey }> {
  const { key, key_hash, key_prefix } = await generateKey()
  const result = await client().from('api_keys').insert({ label: label.trim(), key_hash, key_prefix }).select('*').single()
  return { key, row: unwrap<ApiKey>(result, 'saveApiKey') }
}

export async function revokeApiKey(id: string): Promise<void> {
  check(await client().from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id), 'revokeApiKey')
}
