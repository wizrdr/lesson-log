import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { LessonListItem, LessonWithTutor } from '@/api/lessons'
import { mockMatchMedia, type MatchMediaMock } from '@/test/matchMedia'

const listLessons = vi.fn()
const getLesson = vi.fn()

vi.mock('@/api/lessons', () => ({
  listLessons: () => listLessons(),
  getLesson: (id: string) => getLesson(id),
  requestTranscription: vi.fn(),
  subscribeLessons: () => () => {},
  createLesson: vi.fn(),
  uploadAudio: vi.fn(),
}))
vi.mock('@/api/cards', () => ({ deckStats: () => Promise.resolve({ due: 0, new: 0, total: 0 }) }))
vi.mock('@/api/entries', () => ({
  listRecurringCorrections: () => Promise.resolve([]),
  listEntriesByLesson: () => Promise.resolve([]),
}))
vi.mock('@/api/tutors', () => ({
  listTutors: () => Promise.resolve([]),
  createTutor: vi.fn(),
  confirmTutorConsent: vi.fn(),
}))

import { LessonsLayout } from './LessonsLayout'

const base = {
  user_id: 'u1',
  tutor_id: 't1',
  audio_path: null,
  transcript: null,
  status: 'ready' as const,
  error: null,
  transcription_request_id: null,
  created_at: '2026-09-05T10:00:00Z',
  tutor: { name: 'Анна', language: 'pl' as const },
}
const rows: LessonListItem[] = [
  { ...base, id: 'l1', date: '2026-09-05', entryCount: 0, counts: { correction: 0, vocab: 0, rule: 0 } },
  { ...base, id: 'l2', date: '2026-09-01', entryCount: 0, counts: { correction: 0, vocab: 0, rule: 0 } },
]
const detail: LessonWithTutor = { ...base, id: 'l1', date: '2026-09-05' }

function renderAt(width: number, path: string) {
  const mm = mockMatchMedia(width)
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<LessonsLayout />} />
        <Route path="/lessons/:id" element={<LessonsLayout />} />
      </Routes>
    </MemoryRouter>,
  )
  return mm
}

describe('LessonsLayout', () => {
  let mm: MatchMediaMock | null = null
  beforeEach(() => {
    listLessons.mockReset().mockResolvedValue(rows)
    getLesson.mockReset().mockResolvedValue(detail)
  })
  afterEach(() => {
    mm?.restore()
    mm = null
  })

  it('desktop: "/" shows the list and the placeholder', async () => {
    mm = renderAt(1440, '/')
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /5 сентября/ })).toBeInTheDocument()
    expect(screen.getByText('Выбери урок слева')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'English' })).toBeNull()
  })

  it('desktop: "/lessons/:id" shows the list with the selected row and the lesson without a back link', async () => {
    mm = renderAt(1440, '/lessons/l1')
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(screen.queryByText('Выбери урок слева')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Уроки' })).toBeNull()
    expect(await screen.findByRole('link', { name: /5 сентября/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /1 сентября/ })).not.toHaveAttribute('aria-current')
  })

  it('phone: "/" shows only the list with the language button', async () => {
    mm = renderAt(390, '/')
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.queryByText('Выбери урок слева')).toBeNull()
    expect(getLesson).not.toHaveBeenCalled()
  })

  it('tablet: "/lessons/:id" shows only the lesson without a back link (side nav is there)', async () => {
    mm = renderAt(834, '/lessons/l1')
    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Уроки' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Уроки' })).toBeNull()
    expect(listLessons).not.toHaveBeenCalled()
  })

  it('phone: "/lessons/:id" shows the back link', async () => {
    mm = renderAt(390, '/lessons/l1')
    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Уроки' })).toHaveAttribute('href', '/')
  })

  it('two panels start at 1200, not at 1024', async () => {
    mm = renderAt(1199, '/lessons/l1')
    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(screen.queryByTestId('lessons-list')).toBeNull()
    act(() => mm!.set(1200))
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
  })

  it('desktop: list and lesson scroll independently', async () => {
    mm = renderAt(1440, '/lessons/l1')
    await screen.findByRole('heading', { name: '5 сентября' })
    expect(screen.getByTestId('lessons-list')).toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('lesson-panel')).toHaveClass('overflow-y-auto')
    act(() => mm!.set(834))
    expect(screen.getByTestId('lesson-panel')).not.toHaveClass('overflow-y-auto')
  })

  it('crossing the desktop threshold keeps the lesson mounted and does not refetch it', async () => {
    mm = renderAt(1100, '/lessons/l1')
    const heading = await screen.findByRole('heading', { name: '5 сентября' })
    expect(getLesson).toHaveBeenCalledTimes(1)

    act(() => mm!.set(1440))
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5 сентября' })).toBe(heading)
    expect(listLessons).toHaveBeenCalledTimes(1)

    act(() => mm!.set(1100))
    expect(screen.queryByTestId('lessons-list')).toBeNull()
    expect(screen.getByRole('heading', { name: '5 сентября' })).toBe(heading)
    expect(getLesson).toHaveBeenCalledTimes(1)
  })

  it('crossing the desktop threshold on "/" keeps the list mounted', async () => {
    mm = renderAt(390, '/')
    const heading = await screen.findByRole('heading', { name: 'Уроки' })
    act(() => mm!.set(1440))
    expect(screen.getByRole('heading', { name: 'Уроки' })).toBe(heading)
    expect(screen.getByText('Выбери урок слева')).toBeInTheDocument()
    expect(listLessons).toHaveBeenCalledTimes(1)
  })
})
