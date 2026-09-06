import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1'
import { dedupKey, MAX_CARDS, parseCardsBody } from './cards-input.ts'

Deno.test('parseCardsBody normalizes a valid body', () => {
  const result = parseCardsBody({
    cards: [
      { type: 'vocab', original: '  zeszyt ', corrected: ' тетрадь ', lang: 'pl' },
      { type: 'rule', original: 'Po 5 dopełniacz', explanation: '' },
      { type: 'correction', original: 'ja jest', corrected: 'ja jestem', explanation: null, lang: null },
    ],
  })
  assertEquals(result, {
    ok: true,
    cards: [
      { type: 'vocab', original: 'zeszyt', corrected: 'тетрадь', explanation: null, lang: 'pl' },
      { type: 'rule', original: 'Po 5 dopełniacz', corrected: null, explanation: null, lang: null },
      { type: 'correction', original: 'ja jest', corrected: 'ja jestem', explanation: null, lang: null },
    ],
  })
})

Deno.test('parseCardsBody rejects non-object bodies and empty lists', () => {
  assertEquals(parseCardsBody(null), { ok: false, error: 'body must be a JSON object' })
  assertEquals(parseCardsBody([]), { ok: false, error: 'body must be a JSON object' })
  assertEquals(parseCardsBody({}), { ok: false, error: 'cards must be a non-empty array' })
  assertEquals(parseCardsBody({ cards: [] }), { ok: false, error: 'cards must be a non-empty array' })
  assertEquals(parseCardsBody({ cards: 'x' }), { ok: false, error: 'cards must be a non-empty array' })
})

Deno.test('parseCardsBody enforces the 100 card limit', () => {
  const card = { type: 'vocab', original: 'a' }
  assertEquals(parseCardsBody({ cards: Array.from({ length: MAX_CARDS }, () => card) }).ok, true)
  assertEquals(parseCardsBody({ cards: Array.from({ length: MAX_CARDS + 1 }, () => card) }), {
    ok: false,
    error: 'cards must have at most 100 items',
  })
})

Deno.test('parseCardsBody points at the failing index and field', () => {
  const ok = { type: 'vocab', original: 'a' }
  assertEquals(parseCardsBody({ cards: [ok, 'nope'] }), { ok: false, error: 'cards[1] must be an object' })
  assertEquals(parseCardsBody({ cards: [ok, { type: 'word', original: 'a' }] }), {
    ok: false,
    error: 'cards[1].type must be one of vocab, correction, rule',
  })
  assertEquals(parseCardsBody({ cards: [{ type: 'vocab', original: '   ' }] }), {
    ok: false,
    error: 'cards[0].original must be a non-empty string',
  })
  assertEquals(parseCardsBody({ cards: [{ type: 'vocab' }] }), { ok: false, error: 'cards[0].original must be a non-empty string' })
  assertEquals(parseCardsBody({ cards: [{ type: 'vocab', original: 'a', corrected: 1 }] }), {
    ok: false,
    error: 'cards[0].corrected must be a string',
  })
  assertEquals(parseCardsBody({ cards: [{ type: 'vocab', original: 'a', explanation: [] }] }), {
    ok: false,
    error: 'cards[0].explanation must be a string',
  })
  assertEquals(parseCardsBody({ cards: [ok, ok, { type: 'vocab', original: 'a', lang: 'de' }] }), {
    ok: false,
    error: 'cards[2].lang must be one of pl, en',
  })
})

Deno.test('dedupKey ignores case and surrounding whitespace but not type', () => {
  assertEquals(dedupKey('vocab', '  Zeszyt '), dedupKey('vocab', 'zeszyt'))
  assertEquals(dedupKey('vocab', 'ŻÓŁW'), dedupKey('vocab', 'żółw'))
  assertNotEquals(dedupKey('vocab', 'zeszyt'), dedupKey('rule', 'zeszyt'))
  assertNotEquals(dedupKey('vocab', 'zeszyt'), dedupKey('vocab', 'zeszyty'))
})
