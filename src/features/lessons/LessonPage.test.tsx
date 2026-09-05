import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { LessonWithTutor } from '@/api/lessons'
import type { Entry } from '@/api/types'

const getLesson = vi.fn()
const requestTranscription = vi.fn()
const listEntriesByLesson = vi.fn()
let emit: ((lesson: Partial<LessonWithTutor> & { id: string }) => void) | null = null

vi.mock('@/api/lessons', () => ({
  getLesson: (id: string) => getLesson(id),
  requestTranscription: (id: string) => requestTranscription(id),
  subscribeLessons: (onChange: typeof emit) => {
    emit = onChange
    return () => {
      emit = null
    }
  },
}))
vi.mock('@/api/entries', () => ({ listEntriesByLesson: (id: string) => listEntriesByLesson(id) }))

import { LessonPage } from './LessonPage'

function lesson(over: Partial<LessonWithTutor>): LessonWithTutor {
  const base: LessonWithTutor = {
    id: 'l1',
    user_id: 'u1',
    tutor_id: 't1',
    date: '2026-09-05',
    audio_path: null,
    transcript: null,
    status: 'ready',
    error: null,
    transcription_request_id: null,
    created_at: '2026-09-05T10:00:00Z',
    tutor: { name: 'Анна', language: 'pl' },
  }
  return { ...base, ...over }
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'type' | 'original'>): Entry {
  return {
    lesson_id: 'l1',
    user_id: 'u1',
    corrected: null,
    explanation: null,
    quote: null,
    created_at: '2026-09-05T10:05:00Z',
    deleted_at: null,
    ...over,
  }
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/lessons/l1']}>
      <Routes>
        <Route path="/lessons/:id" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('LessonPage', () => {
  beforeEach(() => {
    getLesson.mockReset()
    requestTranscription.mockReset().mockResolvedValue(undefined)
    listEntriesByLesson.mockReset().mockResolvedValue([])
  })

  it('groups entries by type: corrections, vocab, rules', async () => {
    getLesson.mockResolvedValue(lesson({ transcript: 'Dzień dobry, jak się masz?' }))
    listEntriesByLesson.mockResolvedValue([
      entry({ id: 'e1', type: 'vocab', original: 'zeszyt', corrected: 'тетрадь' }),
      entry({ id: 'e2', type: 'correction', original: 'ja jest', corrected: 'ja jestem', explanation: 'спряжение być', quote: 'ja jest… ja jestem' }),
      entry({ id: 'e3', type: 'rule', original: 'После liczebniki 5+ — dopełniacz' }),
      entry({ id: 'e4', type: 'correction', original: 'dwa kobiety', corrected: 'dwie kobiety' }),
    ])
    renderPage()

    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(screen.getByText('Анна · польский')).toBeInTheDocument()

    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(headings).toEqual(['Исправления 2', 'Слова 1', 'Правила 1'])

    const corrections = screen.getByRole('heading', { name: /Исправления/ }).parentElement!
    expect(corrections).toHaveTextContent('ja jest → ja jestem')
    expect(corrections).toHaveTextContent('dwie kobiety')
    expect(corrections).toHaveTextContent('спряжение być')
    expect(corrections).toHaveTextContent('ja jest… ja jestem')
    expect(corrections).not.toHaveTextContent('zeszyt')

    expect(screen.getByText('4 записи')).toBeInTheDocument()
    expect(screen.getByText('Транскрипт')).toBeInTheDocument()
    expect(screen.getByText('Dzień dobry, jak się masz?')).toBeInTheDocument()
    expect(listEntriesByLesson).toHaveBeenCalledWith('l1')
  })

  it('shows the error and a retry button when the lesson failed', async () => {
    getLesson.mockResolvedValue(lesson({ status: 'failed', error: 'Deepgram: file too long' }))
    renderPage()

    expect(await screen.findByText('Deepgram: file too long')).toBeInTheDocument()
    expect(screen.getByText('ошибка')).toBeInTheDocument()
    expect(listEntriesByLesson).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(requestTranscription).toHaveBeenCalledWith('l1'))
  })

  it('updates status from the realtime subscription and loads entries once ready', async () => {
    getLesson.mockResolvedValue(lesson({ status: 'transcribing' }))
    listEntriesByLesson.mockResolvedValue([entry({ id: 'e1', type: 'vocab', original: 'zeszyt' })])
    renderPage()

    expect(await screen.findByText('Расшифровываем запись — обычно 2–5 минут.')).toBeInTheDocument()
    expect(listEntriesByLesson).not.toHaveBeenCalled()

    emit!({ id: 'l1', status: 'ready' })
    expect(await screen.findByText('zeszyt')).toBeInTheDocument()
    expect(screen.getByText('готово')).toBeInTheDocument()
  })
})
