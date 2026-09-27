import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Block, CourseListItem } from '@/api/course'

const listCourseItems = vi.fn()
const listWeekBodies = vi.fn()
const loadAllProgress = vi.fn()

vi.mock('@/api/course', () => ({
  listCourseItems: () => listCourseItems(),
  listWeekBodies: () => listWeekBodies(),
  loadAllProgress: () => loadAllProgress(),
}))

import { CourseListPage } from './CourseListPage'
import { DONE_MARKER } from './plan'

const item = (id: string, kind: CourseListItem['kind'], week_start: string | null = null): CourseListItem => ({
  id, slug: id, kind, position: 0, title: `T ${id}`, subtitle: null, week_start,
})

const bodies: Record<string, Block[]> = {
  w0: [{ id: 'c', type: 'checklist', title: null, items: [{ id: 'a', md: 'Аркуш' }] }],
  w1: [
    { id: 'h', type: 'heading', text: 'Вт 29.09 · урок', level: 2 },
    { id: 'c', type: 'checklist', title: null, items: [{ id: 'a', md: '[Урок 4](/course/l4)' }, { id: 'b', md: 'Устно' }] },
  ],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-29T09:00:00'))
  listCourseItems.mockResolvedValue([item('w0', 'week', '2026-09-21'), item('w1', 'week', '2026-09-28'), item('l3', 'lesson'), item('l4', 'lesson')])
  listWeekBodies.mockResolvedValue(bodies)
  loadAllProgress.mockResolvedValue({ w0: { c: { done: { a: true } } }, l3: { [DONE_MARKER]: { done: true } } })
})

afterEach(() => vi.useRealTimers())

it('shows the current week with its next step and progress', async () => {
  render(<MemoryRouter><CourseListPage /></MemoryRouter>)
  const now = await screen.findByTestId('course-now')
  expect(within(now).getByText('T w1')).toBeInTheDocument()
  expect(within(now).getByText('0 из 2')).toBeInTheDocument()
  expect(within(now).getByText(/Вт 29\.09 · урок/)).toBeInTheDocument()
  expect(within(screen.getByTestId('course-next-step')).getByRole('link', { name: 'Урок 4' })).toHaveAttribute('href', '/course/l4')
})

it('marks closed weeks and finished lessons', async () => {
  render(<MemoryRouter><CourseListPage /></MemoryRouter>)
  await screen.findByTestId('course-now')
  const status = (slug: string) => screen.getByRole('link', { name: new RegExp(`T ${slug}`) }).querySelector('[data-status]')?.getAttribute('data-status')
  expect(status('w0')).toBe('done')
  expect(status('w1')).toBe('current')
  expect(status('l3')).toBe('done')
  expect(status('l4')).toBe('upcoming')
})
