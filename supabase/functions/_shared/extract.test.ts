import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1'
import { type ExtractionMessage, extractItems, itemsFromMessage } from './extract.ts'

function fakeMessage(overrides: Partial<ExtractionMessage>): ExtractionMessage {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content: [],
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    ...overrides,
  } as ExtractionMessage
}

const item = { type: 'vocab', original: 'sklep', corrected: 'магазин', explanation: '', quote: 'do sklepu' }

Deno.test('itemsFromMessage prefers parsed_output', () => {
  assertEquals(itemsFromMessage(fakeMessage({ parsed_output: { items: [item] } })), [item])
})

Deno.test('itemsFromMessage falls back to the text block', () => {
  const msg = fakeMessage({ content: [{ type: 'text', text: JSON.stringify({ items: [item] }), citations: null }] })
  assertEquals(itemsFromMessage(msg), [item])
})

Deno.test('itemsFromMessage fails on max_tokens and refusal', () => {
  assertThrows(() => itemsFromMessage(fakeMessage({ stop_reason: 'max_tokens', parsed_output: { items: [] } })), Error, 'max_tokens')
  assertThrows(
    () =>
      itemsFromMessage(
        fakeMessage({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms', explanation: null } }),
      ),
    Error,
    'refused',
  )
})

Deno.test('extractItems sends one request per chunk and concatenates items', async () => {
  const prompts: string[] = []
  const transcript = Array.from({ length: 4000 }, (_, i) => `[00:00] Speaker 0: line ${i} ${'x'.repeat(40)}`).join('\n')
  const items = await extractItems(transcript, (prompt) => {
    prompts.push(prompt)
    return Promise.resolve(fakeMessage({ parsed_output: { items: [{ ...item, original: `p${prompts.length}` }] } }))
  })
  assertEquals(prompts.length, 3)
  assertEquals(prompts[0]!.startsWith('Транскрипт (часть 1 из 3):'), true)
  assertEquals(items.map((i) => i.original), ['p1', 'p2', 'p3'])
})

Deno.test('extractItems propagates a chunk failure', async () => {
  await assertRejects(
    () => extractItems('short', () => Promise.resolve(fakeMessage({ stop_reason: 'max_tokens' }))),
    Error,
    'max_tokens',
  )
})
