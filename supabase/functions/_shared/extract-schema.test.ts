import { assertEquals, assertThrows } from 'jsr:@std/assert@1'
import { normalizeItems, SCHEMA, splitTranscript, userPrompt } from './extract-schema.ts'

Deno.test('normalizeItems accepts empty items', () => {
  assertEquals(normalizeItems({ items: [] }), [])
})

Deno.test('normalizeItems drops extra fields, trims strings, fills missing optionals', () => {
  const items = normalizeItems({
    items: [
      { type: 'correction', original: ' poszłem ', corrected: 'poszedłem', explanation: 'мужской род', quote: 'Wczoraj poszłem', confidence: 0.9 },
      { type: 'vocab', original: 'sklep' },
    ],
    extra: true,
  })
  assertEquals(items, [
    { type: 'correction', original: 'poszłem', corrected: 'poszedłem', explanation: 'мужской род', quote: 'Wczoraj poszłem' },
    { type: 'vocab', original: 'sklep', corrected: '', explanation: '', quote: '' },
  ])
})

Deno.test('normalizeItems skips items with unknown type or empty original', () => {
  const items = normalizeItems({
    items: [
      { type: 'typo', original: 'x', corrected: 'y', explanation: '', quote: '' },
      { type: 'rule', original: '   ', corrected: 'y', explanation: '', quote: '' },
      null,
      'garbage',
      { type: 'rule', original: 'ok', corrected: 'y', explanation: '', quote: '' },
    ],
  })
  assertEquals(items.map((i) => i.original), ['ok'])
})

Deno.test('normalizeItems rejects non-object output and missing items', () => {
  assertThrows(() => normalizeItems(null))
  assertThrows(() => normalizeItems('{"items":[]}'))
  assertThrows(() => normalizeItems({}))
  assertThrows(() => normalizeItems({ items: 'none' }))
})

Deno.test('splitTranscript keeps short text whole', () => {
  assertEquals(splitTranscript('a\nb\nc'), ['a\nb\nc'])
})

Deno.test('splitTranscript cuts on line boundaries under the limit', () => {
  const lines = Array.from({ length: 10 }, (_, i) => `[00:0${i}] Speaker 0: ${'x'.repeat(30)}`)
  const text = lines.join('\n')
  const parts = splitTranscript(text, 100)
  assertEquals(parts.length > 1, true)
  for (const p of parts) {
    assertEquals(p.length <= 100, true)
    assertEquals(p.endsWith('\n'), true)
  }
  assertEquals(parts.join(''), text + '\n')
})

Deno.test('splitTranscript drops a trailing whitespace-only chunk', () => {
  assertEquals(splitTranscript('aaaa\n\n\n', 5), ['aaaa\n'])
})

Deno.test('userPrompt marks part numbers only for multi-chunk transcripts', () => {
  assertEquals(userPrompt('T', 0, 1), 'Транскрипт:\n\nT')
  assertEquals(userPrompt('T', 1, 3), 'Транскрипт (часть 2 из 3):\n\nT')
})

Deno.test('SCHEMA matches the spike shape', () => {
  assertEquals(SCHEMA.required, ['items'])
  assertEquals(SCHEMA.properties.items.items.required, ['type', 'original', 'corrected', 'explanation', 'quote'])
  assertEquals(SCHEMA.properties.items.items.properties.type.enum, ['correction', 'vocab', 'rule'])
  assertEquals(SCHEMA.properties.items.items.additionalProperties, false)
})
