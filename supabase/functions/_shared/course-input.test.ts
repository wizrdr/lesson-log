import { assertEquals } from 'jsr:@std/assert@1'
import { parseBlocks, parseCourseBody } from './course-input.ts'

const lesson = {
  slug: '0003-dopelniacz',
  kind: 'lesson',
  position: 3,
  title: 'Nie ma cukru',
  body: [
    { id: 'h1', type: 'heading', text: 'Разогрев' },
    { id: 'warm', type: 'dialog', turns: [{ who: '1', pl: 'Nie ma cukru.', gloss: 'сахара нет' }] },
    {
      id: 'drill', type: 'drill', bank: ['cukru'],
      items: [{ id: 'cukier', prompt: 'Сахара нет.', answers: ['Nie ma cukru', 'Cukru nie ma'], note: 'Вещество → -u' }],
    },
    {
      id: 'q1', type: 'quiz', question: 'od ___ do piątku',
      options: [{ key: 'a', text: 'poniedziałka' }, { key: 'b', text: 'poniedziałku' }],
      answer: 'b', ok: 'Да', bad: 'Нет',
    },
    { id: 'hw', type: 'checklist', items: [{ id: 't1', md: 'с. 41, ćw. 6' }] },
  ],
  cards: [{ type: 'vocab', original: 'сахара нет', corrected: 'Nie ma cukru', lang: 'pl' }],
}

Deno.test('parseCourseBody accepts a full lesson and normalises defaults', () => {
  const r = parseCourseBody({ course: { slug: 'polski-b1', title: 'Польский B1' }, items: [lesson] })
  if (!r.ok) throw new Error(r.error)
  const item = r.value.items[0]
  assertEquals(item.subtitle, null)
  assertEquals(item.week_start, null)
  assertEquals(item.body[0], { id: 'h1', type: 'heading', text: 'Разогрев', level: 2 })
  assertEquals(item.body[2].type === 'drill' && item.body[2].items[0].hint, null)
  assertEquals(item.cards[0].original, 'сахара нет')
})

Deno.test('week items require week_start', () => {
  const r = parseCourseBody({ course: { slug: 'polski-b1', title: 'x' }, items: [{ ...lesson, kind: 'week' }] })
  assertEquals(r, { ok: false, error: 'items[0].week_start is required for kind week' })
})

Deno.test('quiz answer must match an option key', () => {
  const r = parseBlocks([{ id: 'q', type: 'quiz', question: 'q', options: [{ key: 'a', text: 'x' }], answer: 'z', ok: 'y', bad: 'n' }])
  assertEquals(r, { ok: false, error: 'body[0].answer must be one of the option keys' })
})

Deno.test('duplicate block ids and drill item ids are rejected', () => {
  assertEquals(parseBlocks([{ id: 'a', type: 'text', md: 'x' }, { id: 'a', type: 'text', md: 'y' }]), {
    ok: false, error: 'body: duplicate id "a"',
  })
  const drill = { id: 'd', type: 'drill', items: [{ id: 'x', prompt: 'p', answers: ['a'] }, { id: 'x', prompt: 'p', answers: ['a'] }] }
  assertEquals(parseBlocks([drill]), { ok: false, error: 'body[0].items: duplicate id "x"' })
})

Deno.test('table rows must match header width', () => {
  const r = parseBlocks([{ id: 't', type: 'table', head: ['a', 'b'], rows: [['1']] }])
  assertEquals(r, { ok: false, error: 'body[0].rows[0] must have 2 cells' })
})

Deno.test('unknown block type and bad card are reported with a path', () => {
  assertEquals(parseBlocks([{ id: 'x', type: 'video' }]), { ok: false, error: 'body[0].type is unknown: "video"' })
  const r = parseCourseBody({ course: { slug: 'c', title: 't' }, items: [{ ...lesson, cards: [{ type: 'word', original: 'a' }] }] })
  assertEquals(r.ok, false)
})

Deno.test('duplicate item slugs are rejected', () => {
  const r = parseCourseBody({ course: { slug: 'c', title: 't' }, items: [lesson, lesson] })
  assertEquals(r, { ok: false, error: 'items[1].slug duplicates "0003-dopelniacz"' })
})
