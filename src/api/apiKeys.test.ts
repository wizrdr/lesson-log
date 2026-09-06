import { createSupabaseMock } from '@/test/supabaseMock'

const mock = vi.hoisted(() => ({ current: null as ReturnType<typeof import('@/test/supabaseMock').createSupabaseMock> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock.current!.supabase
  },
  supabaseConfigured: true,
}))

import { createApiKey, generateKey, hashKey, listApiKeys, revokeApiKey } from './apiKeys'

beforeEach(() => {
  mock.current = createSupabaseMock()
})

const state = () => mock.current!.state

describe('generateKey', () => {
  it('produces llk_ + 40 hex, its SHA-256 and the 8-char prefix', async () => {
    const { key, key_hash, key_prefix } = await generateKey()
    expect(key).toMatch(/^llk_[0-9a-f]{40}$/)
    expect(key_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(key_prefix).toBe(key.slice(4, 12))
    expect(key_hash).toBe(await hashKey(key))
  })

  it('is random per call while the hash stays deterministic', async () => {
    const a = await generateKey()
    const b = await generateKey()
    expect(a.key).not.toBe(b.key)
    expect(await hashKey(a.key)).toBe(a.key_hash)
    expect(await hashKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('api_keys queries', () => {
  it('listApiKeys hides revoked keys, newest first', async () => {
    state().results.push({ data: [] })
    await listApiKeys()
    const ops = state().ops(0)
    expect(state().calls[0].table).toBe('api_keys')
    expect(ops.is).toEqual(['revoked_at', null])
    expect(ops.order).toEqual(['created_at', { ascending: false }])
  })

  it('createApiKey stores only the hash and prefix and returns the plain key once', async () => {
    state().results.push({ data: { id: 'k1', label: 'script' } })
    const { key, row } = await createApiKey('  script ')
    const inserted = state().ops(0).insert[0] as { label: string; key_hash: string; key_prefix: string }
    expect(Object.keys(inserted).sort()).toEqual(['key_hash', 'key_prefix', 'label'])
    expect(inserted.label).toBe('script')
    expect(inserted.key_hash).toBe(await hashKey(key))
    expect(inserted.key_prefix).toBe(key.slice(4, 12))
    expect(row).toEqual({ id: 'k1', label: 'script' })
  })

  it('revokeApiKey stamps revoked_at by id', async () => {
    state().results.push({ error: null })
    await revokeApiKey('k1')
    const ops = state().ops(0)
    expect(typeof (ops.update[0] as { revoked_at: string }).revoked_at).toBe('string')
    expect(ops.eq).toEqual(['id', 'k1'])
  })

  it('surfaces errors with api-key codes', async () => {
    state().results.push({ data: null, error: { message: 'denied' } })
    await expect(listApiKeys()).rejects.toMatchObject({ code: 'loadApiKeys', detail: 'denied' })
    state().results.push({ data: null, error: { message: 'denied' } })
    await expect(createApiKey('x')).rejects.toMatchObject({ code: 'saveApiKey' })
    state().results.push({ error: { message: 'denied' } })
    await expect(revokeApiKey('k1')).rejects.toMatchObject({ code: 'revokeApiKey' })
  })
})
