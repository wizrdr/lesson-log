import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LessonListItem } from '@/api/lessons'
import type { Tutor } from '@/api/types'

const listLessons = vi.fn()
const listTutors = vi.fn()
const deckStats = vi.fn()
const listRecurringCorrections = vi.fn()

vi.mock('@/api/lessons', () => ({
  listLessons: () => listLessons(),
  subscribeLessons: () => () => {},
  createLesson: vi.fn(),
  uploadAudio: vi.fn(),
}))
vi.mock('@/api/cards', () => ({ deckStats: () => deckStats() }))
vi.mock('@/api/entries', () => ({ listRecurringCorrections: () => listRecurringCorrections() }))
vi.mock('@/api/tutors', () => ({
  listTutors: () => listTutors(),
  createTutor: vi.fn(),
  confirmTutorConsent: vi.fn(),
}))

import { setLang } from '@/i18n'
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
    counts: { correction: 0, vocab: 0, rule: 0 },
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
    deckStats.mockReset().mockResolvedValue({ due: 0, new: 0, total: 0 })
    listRecurringCorrections.mockReset().mockResolvedValue([])
  })

  afterEach(() => setLang('ru'))

  it('switches the interface language with the globe button', async () => {
    listLessons.mockResolvedValue([lesson({ id: 'l1', status: 'ready', entryCount: 2, counts: { correction: 1, vocab: 1, rule: 0 } })])
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Уроки' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Lessons' })).toBeInTheDocument()
    expect(screen.getByText('2 entries · 1 correction, 1 word')).toBeInTheDocument()
    expect(screen.getByText('Анна · Polish')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /September 5/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Русский' }))
    expect(screen.getByRole('heading', { name: 'Уроки' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no lessons', async () => {
    renderPage()
    expect(await screen.findByText(/Уроков пока нет/)).toBeInTheDocument()
    expect(screen.queryByTestId('summary')).toBeNull()
  })

  it('lists lessons with tutor, language, entry breakdown and status line', async () => {
    listLessons.mockResolvedValue([
      lesson({ id: 'l1', status: 'ready', entryCount: 12, counts: { correction: 7, vocab: 4, rule: 1 } }),
      lesson({ id: 'l2', date: '2026-09-01', status: 'transcribing' }),
      lesson({ id: 'l3', date: '2026-08-30', status: 'uploaded' }),
      lesson({ id: 'l4', date: '2026-08-28', status: 'failed', error: 'Deepgram: file too long' }),
    ])
    renderPage()
    expect(await screen.findByText('12 записей · 7 исправлений, 4 слова, 1 правило')).toBeInTheDocument()
    expect(screen.getByText('Разбор записи, обычно 2–5 минут')).toBeInTheDocument()
    expect(screen.getByText('Загружено, ждёт расшифровки')).toBeInTheDocument()
    expect(screen.getByText('Ошибка расшифровки: Deepgram: file too long')).toBeInTheDocument()
    expect(screen.getAllByText('Анна · польский')).toHaveLength(4)
    expect(screen.getByRole('link', { name: /5 сентября/ })).toHaveAttribute('href', '/lessons/l1')
  })

  it('shows due cards and the recurring correction in the summary line', async () => {
    deckStats.mockResolvedValue({ due: 3, new: 1, total: 20 })
    listRecurringCorrections.mockResolvedValue([{ original: 'poszłem', corrected: 'poszedłem', lessonCount: 3 }])
    renderPage()
    const summary = await screen.findByTestId('summary')
    expect(summary).toHaveTextContent('К повторению сегодня — 3 карточки. Повторяющаяся ошибка: poszłem poszedłem.')
    expect(summary.querySelector('s')).toHaveTextContent('poszłem')
    expect(summary.querySelector('strong')).toHaveTextContent('poszedłem')
  })

  it('shows only the due cards when nothing recurs', async () => {
    deckStats.mockResolvedValue({ due: 1, new: 0, total: 5 })
    renderPage()
    expect(await screen.findByTestId('summary')).toHaveTextContent(/^К повторению сегодня — 1 карточка\.$/)
  })

  it('keeps the upload button disabled until the tutor consent toggle is on', async () => {
    renderPage()
    await screen.findByText(/Уроков пока нет/)
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
    await screen.findByText(/Уроков пока нет/)
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить урок' }))
    await waitFor(() => expect(screen.getByLabelText('Репетитор')).toHaveValue('t1'))
    expect(screen.queryByRole('switch')).toBeNull()

    fireEvent.change(screen.getByLabelText('Запись урока'), { target: { files: [new File(['x'], 'a.m4a')] } })
    expect(uploadButton()).toBeEnabled()
  })

  it('warns about files over 50 MB without blocking the upload', async () => {
    listTutors.mockResolvedValue([tutor])
    renderPage()
    await screen.findByText(/Уроков пока нет/)
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить урок' }))
    await screen.findByLabelText('Репетитор')

    const big = new File(['x'], 'big.m4a')
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Запись урока'), { target: { files: [big] } })
    expect(screen.getByText(/больше 50 МБ/)).toBeInTheDocument()
    expect(uploadButton()).toBeEnabled()
  })
})
