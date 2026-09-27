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
