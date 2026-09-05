import { assertEquals } from 'jsr:@std/assert@1'
import { safeEqual, validCallbackToken } from './callback-token.ts'

Deno.test('safeEqual compares full strings', () => {
  assertEquals(safeEqual('secret', 'secret'), true)
  assertEquals(safeEqual('secret', 'secret2'), false)
  assertEquals(safeEqual('secret', 'Secret'), false)
  assertEquals(safeEqual('', ''), true)
})

Deno.test('validCallbackToken accepts only a matching token query param', () => {
  const ok = new URL('https://x.supabase.co/functions/v1/ll-extract?lesson=1&token=abc')
  assertEquals(validCallbackToken(ok, 'abc'), true)
  assertEquals(validCallbackToken(ok, 'abd'), false)
  assertEquals(validCallbackToken(new URL('https://x.supabase.co/functions/v1/ll-extract?lesson=1'), 'abc'), false)
  assertEquals(validCallbackToken(new URL('https://x.supabase.co/functions/v1/ll-extract?token='), ''), false)
})
