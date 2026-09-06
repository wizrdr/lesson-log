import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { LessonEntry } from '@/api/entries'
import type { LessonWithTutor } from '@/api/lessons'

const getLesson = vi.fn()
const requestTranscription = vi.fn()
const listEntriesByLesson = vi.fn()
const addToDeck = vi.fn()
const removeFromDeck = vi.fn()
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
vi.mock('@/api/cards', () => ({
  addToDeck: (...args: unknown[]) => addToDeck(...args),
  removeFromDeck: (...args: unknown[]) => removeFromDeck(...args),
}))

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

const DUE = { due: '2026-09-05T08:00:00Z' }
const LATER = { due: '2999-01-01T00:00:00Z' }

function entry(over: Partial<LessonEntry> & Pick<LessonEntry, 'id' | 'type' | 'original'>): LessonEntry {
  return {
    lesson_id: 'l1',
    user_id: 'u1',
    corrected: null,
    explanation: null,
    quote: null,
    lang: null,
    created_at: '2026-09-05T10:05:00Z',
    deleted_at: null,
    card: DUE,
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
    addToDeck.mockReset().mockResolvedValue(undefined)
    removeFromDeck.mockReset().mockResolvedValue(undefined)
  })

  it('groups entries by type: corrections, vocab, rules', async () => {
    getLesson.mockResolvedValue(lesson({ transcript: 'Dzień dobry, jak się masz?' }))
    listEntriesByLesson.mockResolvedValue([
      entry({ id: 'e1', type: 'vocab', original: 'zeszyt', corrected: 'тетрадь' }),
      entry({ id: 'e2', type: 'correction', original: 'ja jest', corrected: 'ja jestem', explanation: 'спряжение być', quote: 'ja jest… ja jestem' }),
      entry({ id: 'e3', type: 'rule', original: 'После liczebniki 5+ — dopełniacz' }),
      entry({ id: 'e4', type: 'correction', original: 'dwa kobiety', corrected: 'dwie kobiety', card: LATER }),
    ])
    renderPage()

    expect(await screen.findByRole('heading', { name: '5 сентября' })).toBeInTheDocument()
    expect(await screen.findByText('Анна · польский · 4 записи')).toBeInTheDocument()

    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(headings).toEqual(['Исправления · 2', 'Слова · 1', 'Правила · 1'])

    const corrections = screen.getByRole('heading', { name: /Исправления/ }).parentElement!
    expect(corrections.querySelector('s')).toHaveTextContent('ja jest')
    expect(corrections.querySelector('strong')).toHaveTextContent('ja jestem')
    expect(corrections).toHaveTextContent('dwie kobiety')
    expect(corrections).toHaveTextContent('спряжение być')
    expect(corrections).toHaveTextContent('ja jest… ja jestem')
    expect(corrections).not.toHaveTextContent('zeszyt')

    expect(screen.getByRole('button', { name: 'Повторить 3 карточки' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Уроки' })).toHaveAttribute('href', '/')
    expect(screen.getByText('Транскрипт')).toBeInTheDocument()
    expect(screen.getByText('Dzień dobry, jak się masz?')).toBeInTheDocument()
    expect(listEntriesByLesson).toHaveBeenCalledWith('l1')
  })

  it('shows the error and a retry button when the lesson failed', async () => {
    getLesson.mockResolvedValue(lesson({ status: 'failed', error: 'Deepgram: file too long' }))
    renderPage()

    expect(await screen.findByText('Ошибка расшифровки: Deepgram: file too long')).toBeInTheDocument()
    expect(listEntriesByLesson).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Повторить расшифровку' }))
    await waitFor(() => expect(requestTranscription).toHaveBeenCalledWith('l1'))
  })

  it('updates status from the realtime subscription and loads entries once ready', async () => {
    getLesson.mockResolvedValue(lesson({ status: 'transcribing' }))
    listEntriesByLesson.mockResolvedValue([entry({ id: 'e1', type: 'vocab', original: 'zeszyt' })])
    renderPage()

    expect(await screen.findByText('Разбор записи, обычно 2–5 минут')).toBeInTheDocument()
    expect(listEntriesByLesson).not.toHaveBeenCalled()

    emit!({ id: 'l1', status: 'ready' })
    expect(await screen.findByText('zeszyt')).toBeInTheDocument()
    expect(screen.queryByText('Разбор записи, обычно 2–5 минут')).toBeNull()
    expect(screen.getByText('Анна · польский · 1 запись')).toBeInTheDocument()
  })

  it('says everything is reviewed when no card of the lesson is due, and toggles deck membership per entry', async () => {
    getLesson.mockResolvedValue(lesson({}))
    listEntriesByLesson.mockResolvedValue([
      entry({ id: 'e1', type: 'vocab', original: 'zeszyt', card: LATER }),
      entry({ id: 'e2', type: 'rule', original: 'reguła', card: null }),
    ])
    renderPage()

    expect(await screen.findByText('Все карточки урока повторены')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Повторить/ })).toBeNull()

    const inDeck = screen.getByRole('button', { name: 'Убрать из колоды', pressed: true })
    const outOfDeck = screen.getByRole('button', { name: 'В колоду', pressed: false })
    fireEvent.click(outOfDeck)
    expect(addToDeck).toHaveBeenCalledWith('e2')
    await waitFor(() => expect(outOfDeck).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Повторить 1 карточка' })).toBeInTheDocument()

    fireEvent.click(inDeck)
    expect(removeFromDeck).toHaveBeenCalledWith('e1')
    await waitFor(() => expect(inDeck).toHaveAttribute('aria-pressed', 'false'))
  })

  it('stacks long originals on two lines instead of inline', async () => {
    const long = 'Wczoraj wieczorem poszłem z kolegami do nowego sklepu na rogu ulicy i kupiłem chleb'
    getLesson.mockResolvedValue(lesson({}))
    listEntriesByLesson.mockResolvedValue([entry({ id: 'e1', type: 'correction', original: long, corrected: 'poszedłem' })])
    renderPage()

    const original = await screen.findByText(long)
    expect(original.parentElement).toHaveClass('block')
  })
})
