import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Shell } from '@/app/Shell'
import { setCourseFocus } from '@/lib/focusMode'
import { mockMatchMedia, type MatchMediaMock } from '@/test/matchMedia'

vi.mock('@/api/course', () => ({
  listCourseItems: () => Promise.resolve([{ id: '1', slug: 'wymowa', kind: 'reference', position: 1, title: 'Wymowa', subtitle: null, week_start: null }]),
  getCourseItem: () => Promise.resolve({ id: '1', slug: 'wymowa', kind: 'reference', position: 1, title: 'Wymowa', subtitle: null, week_start: null, body: [], cards: [] }),
  loadProgress: () => Promise.resolve({}),
  saveProgress: () => Promise.resolve(),
  importCards: () => Promise.resolve({ created: 0, skipped: 0 }),
}))

import { CourseLayout } from './CourseLayout'

let mm: MatchMediaMock

function renderAt(path: string, width: number) {
  mm = mockMatchMedia(width)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/course" element={<CourseLayout />} />
          <Route path="/course/:slug" element={<CourseLayout />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('course focus mode', () => {
  afterEach(() => {
    act(() => setCourseFocus(false))
    mm.restore()
  })

  it('hides the app side nav and the course list, and brings them back', async () => {
    renderAt('/course/wymowa', 1300)
    await screen.findByRole('heading', { name: 'Wymowa' })
    expect(screen.getByTestId('side-nav')).toBeInTheDocument()
    expect(screen.getByTestId('course-list')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть панели' }))
    expect(screen.queryByTestId('side-nav')).toBeNull()
    expect(screen.queryByTestId('course-list')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Показать панели' }))
    expect(screen.getByTestId('side-nav')).toBeInTheDocument()
    expect(screen.getByTestId('course-list')).toBeInTheDocument()
  })

  it('keeps the list visible on the course index even in focus mode', async () => {
    act(() => setCourseFocus(true))
    renderAt('/course', 1300)
    expect(await screen.findByTestId('course-list')).toBeInTheDocument()
    expect(screen.getByTestId('side-nav')).toBeInTheDocument()
  })

  it('offers no toggle on a phone', async () => {
    renderAt('/course/wymowa', 390)
    await screen.findByRole('heading', { name: 'Wymowa' })
    expect(screen.queryByRole('button', { name: 'Скрыть панели' })).toBeNull()
  })
})
