import { assertEquals } from 'jsr:@std/assert@1'
import { parseLevelDoc } from './level-input.ts'

const doc = {
  summary: { overall: 'Понимание B1, производство A2', updated_on: '2026-09-27' },
  skills: [{ key: 'sluchanie', cefr: 'B1' }],
  tests: [
    { id: 't2', date: '2026-12-20', title: 'Аркуш 2019', scores: { pisanie: { got: 18, max: 30 } } },
    { id: 't1', date: '2026-09-27', title: 'Аркуш 2020', url: 'https://certyfikatpolski.pl/x.pdf', scores: { sluchanie: { got: 27.5, max: 30 }, mowienie: null } },
  ],
  topics: [{ id: 'future', title: 'Будущее время', skill: 'gramatyka', status: 'in_progress', item_slug: '0004-czas-przyszly' }],
  checkpoints: [{ id: 'dec', date: '2026-12-20', title: 'Второй аркуш', rule: 'ниже 40% → июнь', status: 'upcoming' }],
}

Deno.test('parseLevelDoc accepts a full document, sorts tests and drops null scores', () => {
  const r = parseLevelDoc(doc)
  if (!r.ok) throw new Error(r.error)
  assertEquals(r.value.tests.map((t) => t.id), ['t1', 't2'])
  assertEquals(r.value.tests[0].scores, { sluchanie: { got: 27.5, max: 30 } })
  assertEquals(r.value.summary.verdict, null)
  assertEquals(r.value.skills[0].note, null)
})

Deno.test('parseLevelDoc rejects bad scores, unknown skills, unsafe urls and duplicate ids', () => {
  const bad = (patch: Record<string, unknown>) => parseLevelDoc({ ...doc, ...patch })
  assertEquals(bad({ tests: [{ ...doc.tests[1], scores: { sluchanie: { got: 31, max: 30 } } }] }).ok, false)
  assertEquals(bad({ tests: [{ ...doc.tests[1], scores: { mowa: { got: 1, max: 2 } } }] }).ok, false)
  assertEquals(bad({ tests: [{ ...doc.tests[1], url: 'javascript:alert(1)' }] }).ok, false)
  assertEquals(bad({ topics: [doc.topics[0], doc.topics[0]] }).ok, false)
  assertEquals(bad({ topics: [{ ...doc.topics[0], status: 'done' }] }).ok, false)
  assertEquals(parseLevelDoc({ ...doc, summary: { overall: 'x', updated_on: '27.09' } }).ok, false)
})
