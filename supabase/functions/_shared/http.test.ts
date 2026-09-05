import { assertEquals } from 'jsr:@std/assert@1'
import { corsHeaders, json, readJson } from './http.ts'

Deno.test('corsHeaders echoes the request origin', () => {
  const req = new Request('https://fn.test', { headers: { Origin: 'https://wizrdr.github.io' } })
  assertEquals((corsHeaders(req) as Record<string, string>)['Access-Control-Allow-Origin'], 'https://wizrdr.github.io')
})

Deno.test('json sets status, body and content-type', async () => {
  const res = json(new Request('https://fn.test'), 404, { error: 'nope' })
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  assertEquals(await res.json(), { error: 'nope' })
})

Deno.test('readJson returns {} on malformed or non-object bodies', async () => {
  const bad = new Request('https://fn.test', { method: 'POST', body: '{oops' })
  assertEquals(await readJson(bad), {})
  const arr = new Request('https://fn.test', { method: 'POST', body: '[1]' })
  assertEquals(await readJson(arr), {})
  const ok = new Request('https://fn.test', { method: 'POST', body: '{"lesson_id":"x"}' })
  assertEquals(await readJson(ok), { lesson_id: 'x' })
})
