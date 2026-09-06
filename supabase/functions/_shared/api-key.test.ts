import { assertEquals, assertMatch, assertNotEquals } from 'jsr:@std/assert@1'
import { hashKey, isApiKey, keyPrefix, toHex } from './api-key.ts'

const KEY = 'llk_' + 'ab'.repeat(20)

Deno.test('isApiKey accepts llk_ + 40 lowercase hex and nothing else', () => {
  assertEquals(isApiKey(KEY), true)
  assertEquals(isApiKey('llk_' + 'AB'.repeat(20)), false)
  assertEquals(isApiKey('llk_' + 'ab'.repeat(19)), false)
  assertEquals(isApiKey('llk_' + 'ab'.repeat(21)), false)
  assertEquals(isApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.x.y'), false)
  assertEquals(isApiKey(''), false)
})

Deno.test('hashKey is deterministic SHA-256 hex and differs per key', async () => {
  const a = await hashKey(KEY)
  assertEquals(a, await hashKey(KEY))
  assertMatch(a, /^[0-9a-f]{64}$/)
  assertNotEquals(a, await hashKey(KEY.replace(/b$/, 'c')))
  assertEquals(await hashKey('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

Deno.test('keyPrefix takes the first 8 chars after llk_', () => {
  assertEquals(keyPrefix('llk_1234567890abcdef'), '12345678')
})

Deno.test('toHex pads every byte', () => {
  assertEquals(toHex(new Uint8Array([0, 1, 15, 255])), '00010fff')
})
