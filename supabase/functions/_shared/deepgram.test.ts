import { assertEquals } from 'jsr:@std/assert@1'
import { type DeepgramResponse, deepgramError, deepgramText, fmtTime } from './deepgram.ts'

const fixture: DeepgramResponse = JSON.parse(
  await Deno.readTextFile(new URL('./fixtures/deepgram.json', import.meta.url)),
)

Deno.test('fmtTime renders mm:ss and h:mm:ss', () => {
  assertEquals(fmtTime(0.48), '00:00')
  assertEquals(fmtTime(65.2), '01:05')
  assertEquals(fmtTime(3661), '1:01:01')
  assertEquals(fmtTime(null), '??:??')
})

Deno.test('deepgramText builds speaker-labelled lines from utterances', () => {
  assertEquals(
    deepgramText(fixture),
    [
      '[00:00] Speaker 0: Dzień dobry. Jak się masz?',
      '[00:03] Speaker 1: Dobrze, dziękuję. Wczoraj poszłem do sklepu.',
      '[01:05] Speaker 0: Poszedłem, nie poszłem. Męski rodzaj.',
      '[1:01:01] Speaker 1: Dziękuję, do zobaczenia.',
      '',
    ].join('\n'),
  )
})

Deno.test('deepgramText falls back to channel transcript without utterances', () => {
  const raw: DeepgramResponse = { results: { channels: fixture.results!.channels } }
  assertEquals(deepgramText(raw), `${fixture.results!.channels![0]!.alternatives![0]!.transcript}\n`)
})

Deno.test('deepgramError reports missing results', () => {
  assertEquals(deepgramError(fixture), null)
  assertEquals(deepgramError({ err_code: 'REMOTE_CONTENT_ERROR', err_msg: 'could not fetch url' }), 'could not fetch url')
  assertEquals(deepgramError({}), 'Deepgram returned no results')
})
