import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LessonListItem } from '@/api/lessons'
import type { Tutor } from '@/api/types'

const listLessons = vi.fn()
const listTutors = vi.fn()

vi.mock('@/api/lessons', () => ({
  listLessons: () => listLessons(),
  subscribeLessons: () => () => {},
  createLesson: vi.fn(),
  uploadAudio: vi.fn(),
}))
vi.mock('@/api/tutors', () => ({
  listTutors: () => listTutors(),
  createTutor: vi.fn(),
  confirmTutorConsent: vi.fn(),
}))

import { LessonsPage } from './LessonsPage'

const tutor: Tutor = {
  id: 't1',
  user_id: 'u1',
  name: 'Анна',
  language: 'pl',
  consent_at: '2026-09-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
}

function lesson(over: Partial<LessonListItem>): LessonListItem {
  const base: LessonListItem = {
    id: 'l1',
    user_id: 'u1',
    tutor_id: 't1',
    date: '2026-09-05',
    audio_path: null,
    transcript: null,
    status: 'uploaded',
    error: null,
    transcription_request_id: null,
    created_at: '2026-09-05T10:00:00Z',
    tutor: { name: 'Анна', language: 'pl' },
    entryCount: 0,
  }
  return { ...base, ...over }
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <LessonsPage />
    </MemoryRouter>,
  )

const uploadButton = () => screen.getByRole('button', { name: 'Загрузить' })

describe('LessonsPage', () => {
  beforeEach(() => {
    listLessons.mockReset().mockResolvedValue([])
    listTutors.mockReset().mockResolvedValue([])
  })

  it('shows the empty state when there are no lessons', async () => {
    renderPage()
    expect(await screen.findByText('Уроков пока нет')).toBeInTheDocument()
  })

  it('lists lessons with tutor, language and status badge including entry count', async () => {
    listLessons.mockResolvedValue([
      lesson({ id: 'l1', status: 'ready', entryCount: 3 }),
      lesson({ id: 'l2', date: '2026-09-01', status: 'failed' }),
    ])
    renderPage()
    expect(await screen.findByText('готово · 3 записи')).toBeInTheDocument()
    expect(screen.getByText('ошибка')).toBeInTheDocument()
    expect(screen.getAllByText('Анна · польский')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /5 сентября/ })).toHaveAttribute('href', '/lessons/l1')
  })

  it('keeps the upload button disabled until the tutor consent toggle is on', async () => {
    renderPage()
    await screen.findByText('Уроков пока нет')
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить урок' }))
    expect(screen.getByRole('dialog', { name: 'Загрузить урок' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Имя репетитора'), { target: { value: 'Анна' } })
    const file = new File(['x'], 'audio_only.m4a', { type: 'audio/mp4' })
    fireEvent.change(screen.getByLabelText('Запись урока'), { target: { files: [file] } })
    expect(screen.getByText('audio_only.m4a · 1 КБ')).toBeInTheDocument()
    expect(uploadButton()).toBeDisabled()

    fireEvent.click(screen.getByRole('switch', { name: 'Репетитор предупреждён о записи' }))
    expect(uploadButton()).toBeEnabled()
  })

  it('does not ask for consent again for a tutor who already gave it', async () => {
    listTutors.mockResolvedValue([tutor])
    renderPage()
    await screen.findByText('Уроков пока нет')
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить урок' }))
    await waitFor(() => expect(screen.getByLabelText('Репетитор')).toHaveValue('t1'))
    expect(screen.queryByRole('switch')).toBeNull()

    fireEvent.change(screen.getByLabelText('Запись урока'), { target: { files: [new File(['x'], 'a.m4a')] } })
    expect(uploadButton()).toBeEnabled()
  })

  it('warns about files over 50 MB without blocking the upload', async () => {
    listTutors.mockResolvedValue([tutor])
    renderPage()
    await screen.findByText('Уроков пока нет')
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить урок' }))
    await screen.findByLabelText('Репетитор')

    const big = new File(['x'], 'big.m4a')
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Запись урока'), { target: { files: [big] } })
    expect(screen.getByText(/больше 50 МБ/)).toBeInTheDocument()
    expect(uploadButton()).toBeEnabled()
  })
})
