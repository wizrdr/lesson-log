import type { Block, CourseListItem } from '@/api/course'
import { DONE_MARKER, buildPlan } from './plan'

const week = (id: string, week_start: string): CourseListItem => ({ id, slug: id, kind: 'week', position: 0, title: id, subtitle: null, week_start })
const lesson: CourseListItem = { id: 'l1', slug: 'l1', kind: 'lesson', position: 1, title: 'l1', subtitle: null, week_start: null }
const items = [week('w0', '2026-09-21'), week('w1', '2026-09-28'), week('w2', '2026-10-05'), lesson]

const bodies: Record<string, Block[]> = {
  w0: [{ id: 'c', type: 'checklist', title: null, items: [{ id: 'a', md: 'Аркуш' }] }],
  w1: [
    { id: 'h1', type: 'heading', text: 'Вт 29.09 · урок', level: 2 },
    { id: 'c1', type: 'checklist', title: null, items: [{ id: 'a', md: 'Урок 4' }, { id: 'b', md: 'Устно' }] },
    { id: 'h2', type: 'heading', text: 'Ср 30.09', level: 2 },
    { id: 'c2', type: 'checklist', title: 'Тетрадь', items: [{ id: 'a', md: 'Упр. 1' }] },
  ],
  w2: [{ id: 't', type: 'text', md: 'Детали — в понедельник' }],
}

const monday = new Date('2026-09-28T10:00:00')

it('marks the week containing today as current and points at its first open step', () => {
  const { weeks, focus } = buildPlan(items, bodies, { w1: { c1: { done: { a: true } } } }, monday)
  expect(weeks.map((w) => w.status)).toEqual(['missed', 'current', 'upcoming'])
  expect(focus?.item.id).toBe('w1')
  expect(focus?.checked).toBe(1)
  expect(focus?.total).toBe(3)
  expect(focus?.next).toEqual({ heading: 'Вт 29.09 · урок', md: 'Устно' })
})

it('uses the checklist title over the heading for the next step', () => {
  const { focus } = buildPlan(items, bodies, { w1: { c1: { done: { a: true, b: true } } } }, monday)
  expect(focus?.next).toEqual({ heading: 'Тетрадь', md: 'Упр. 1' })
})

it('closes a week when every item is checked or when it is marked done', () => {
  const all = buildPlan(items, bodies, { w0: { c: { done: { a: true } } } }, monday)
  expect(all.weeks[0].status).toBe('done')
  const manual = buildPlan(items, bodies, { w0: { [DONE_MARKER]: { done: true } } }, monday)
  expect(manual.weeks[0].status).toBe('done')
  expect(manual.weeks[0].next).toBeNull()
})

it('never auto-closes a week without checklist items', () => {
  const { weeks } = buildPlan(items, bodies, {}, new Date('2026-10-06T10:00:00'))
  expect(weeks[2].status).toBe('current')
  expect(weeks[2].total).toBe(0)
})

it('names the next open week after the focus', () => {
  const { after } = buildPlan(items, bodies, {}, monday)
  expect(after?.item.id).toBe('w2')
})

it('falls back to the latest missed week when today is past the plan', () => {
  const { focus } = buildPlan(items, bodies, {}, new Date('2026-11-30T10:00:00'))
  expect(focus?.item.id).toBe('w2')
  expect(focus?.status).toBe('missed')
})

describe('dated steps', () => {
  const realWeek: Block[] = [
    { id: 'hd', type: 'heading', text: 'Каждый день · 21:15 (сб — в блоке 10:00) · письмо от руки', level: 2 },
    {
      id: 'daily',
      type: 'checklist',
      title: null,
      items: [
        { id: 'mo', md: '**Пн 28.09** · SMS другу' },
        { id: 'tu', md: '**Вт 29.09** · Что сделаешь завтра' },
        { id: 'we', md: '**Ср 30.09** · SMS хозяину' },
      ],
    },
    { id: 'hl', type: 'heading', text: 'Вт 29.09 · 18:00 · урок', level: 2 },
    { id: 'lesson', type: 'checklist', title: null, items: [{ id: 'l', md: '[Урок 4](/course/0004-czas-przyszly)' }, { id: 'o', md: '[с. 175](https://x.pl/a-12.10.pdf)' }] },
    { id: 'hs', type: 'heading', text: 'Вс 04.10 · 10:00–11:45 · большой блок', level: 2 },
    { id: 'sun', type: 'checklist', title: null, items: [{ id: 's', md: 'ćw. 12' }] },
    { id: 'hc', type: 'heading', text: 'Карточки недели', level: 2 },
    { id: 'cards', type: 'checklist', title: null, items: [{ id: 'k', md: 'Карточки урока 4' }] },
  ]
  const one = [week('w1', '2026-09-28')]
  const tuesday = new Date('2026-09-29T20:00:00')

  it('collects today by the item date and by the heading date, and counts past days', () => {
    const { focus } = buildPlan(one, { w1: realWeek }, {}, tuesday)
    expect(focus?.today).toEqual([
      { heading: 'Вт 29.09 · 18:00 · урок', md: '[Урок 4](/course/0004-czas-przyszly)' },
      { heading: 'Вт 29.09 · 18:00 · урок', md: '[с. 175](https://x.pl/a-12.10.pdf)' },
      { heading: 'Каждый день · 21:15 (сб — в блоке 10:00) · письмо от руки', md: '**Вт 29.09** · Что сделаешь завтра' },
    ])
    expect(focus?.overdue).toBe(1)
    expect(focus?.next?.md).toBe('**Вт 29.09** · Что сделаешь завтра')
  })

  it('never points the next step into the past', () => {
    const progress = { w1: { daily: { done: { tu: true, we: true } }, lesson: { done: { l: true, o: true } } } }
    const { focus } = buildPlan(one, { w1: realWeek }, progress, tuesday)
    expect(focus?.today).toEqual([])
    expect(focus?.overdue).toBe(1)
    expect(focus?.next).toEqual({ heading: 'Вс 04.10 · 10:00–11:45 · большой блок', md: 'ćw. 12' })
  })

  it('falls back to undated steps, then to overdue ones', () => {
    const allDatedDone = { w1: { daily: { done: { tu: true, we: true } }, lesson: { done: { l: true, o: true } }, sun: { done: { s: true } } } }
    expect(buildPlan(one, { w1: realWeek }, allDatedDone, tuesday).focus?.next?.md).toBe('Карточки урока 4')
    const onlyPast = { w1: { ...allDatedDone.w1, cards: { done: { k: true } } } }
    const { focus } = buildPlan(one, { w1: realWeek }, onlyPast, tuesday)
    expect(focus?.next?.md).toBe('**Пн 28.09** · SMS другу')
    expect(focus?.overdue).toBe(1)
  })

  it('takes the year across New Year from week_start', () => {
    const body: Block[] = [
      { id: 'h', type: 'heading', text: 'Пт 01.01', level: 2 },
      { id: 'c', type: 'checklist', title: null, items: [{ id: 'a', md: 'Новогоднее' }, { id: 'b', md: '**Ср 30.12** · Старое' }] },
    ]
    const { focus } = buildPlan([week('ny', '2026-12-28')], { ny: body }, {}, new Date('2027-01-01T09:00:00'))
    expect(focus?.today.map((s) => s.md)).toEqual(['Новогоднее'])
    expect(focus?.overdue).toBe(1)
  })
})

it('orders today by the time in the section heading', () => {
  const w = { id: 'wt', slug: 'wt', kind: 'week' as const, position: 0, title: 'wt', subtitle: null, week_start: '2026-09-28' }
  const body: Block[] = [
    { id: 'h0', type: 'heading', text: 'Каждый день · 21:15 · письмо', level: 2 },
    { id: 'c0', type: 'checklist', title: null, items: [{ id: 'a', md: '**Вт 29.09** · письмо' }] },
    { id: 'h1', type: 'heading', text: 'Вт 29.09 · 18:00 · урок', level: 2 },
    { id: 'c1', type: 'checklist', title: null, items: [{ id: 'a', md: 'Урок 4' }] },
  ]
  const { focus } = buildPlan([w], { wt: body }, {}, new Date('2026-09-29T12:00:00'))
  expect(focus?.today.map((s) => s.md)).toEqual(['Урок 4', '**Вт 29.09** · письмо'])
})
