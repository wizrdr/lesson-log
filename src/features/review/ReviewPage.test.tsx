import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DueCard } from '@/api/cards'
import { ApiError } from '@/api/client'

const listDueCards = vi.fn()
const deckStats = vi.fn()
const reviewCard = vi.fn()

vi.mock('@/api/cards', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/cards')>()),
  listDueCards: () => listDueCards(),
  deckStats: () => deckStats(),
  reviewCard: (...args: unknown[]) => reviewCard(...args),
}))

import { ReviewPage } from './ReviewPage'

function card(over: Partial<DueCard['entry']> & Pick<DueCard['entry'], 'id' | 'type' | 'original'>, state: DueCard['state'] = 0): DueCard {
  return {
    entry_id: over.id,
    user_id: 'u1',
    due: '2026-09-05T08:00:00Z',
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state,
    last_review: null,
    entry: {
      corrected: null,
      explanation: null,
      quote: null,
      lang: null,
      lesson: { date: '2026-09-05', tutor: { name: 'Анна', language: 'pl' } },
      ...over,
    },
  }
}

const correction = card({ id: 'e1', type: 'correction', original: 'ja jest', corrected: 'ja jestem', explanation: 'спряжение być', quote: 'ja jest… ja jestem' })
const vocab = card({ id: 'e2', type: 'vocab', original: 'zeszyt', corrected: 'тетрадь', lesson: null }, 2)

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  )

const showAnswer = () => screen.getByRole('button', { name: 'Показать ответ' })
const skip = () => screen.getByRole('button', { name: 'Пропустить' })

describe('ReviewPage', () => {
  beforeEach(() => {
    listDueCards.mockReset().mockResolvedValue([correction, vocab])
    deckStats.mockReset().mockResolvedValue({ due: 2, new: 1, total: 7 })
    reviewCard.mockReset().mockImplementation((c: DueCard) => Promise.resolve(c))
  })

  it('shows the counters, the progress line and the face of the first card as an interactive index card', async () => {
    renderPage()
    expect(await screen.findByTestId('deck-stats')).toHaveTextContent('К повторению2Новых1В колоде7')
    expect(screen.getByText('Карточка 1 из 2 · 1 новая')).toBeInTheDocument()

    const face = screen.getByTestId('card-face')
    expect(face.tagName).toBe('BUTTON')
    expect(face).toHaveClass('bg-surface', 'border-border-strong', 'shadow-card', 'cursor-pointer')
    expect(screen.getByTestId('card-meta')).toHaveTextContent('Исправление · PL · 5 сентября')
    expect(face).toHaveTextContent('ja jest')
    expect(face).toHaveTextContent('Как правильно? Нажми, чтобы проверить')
    expect(screen.queryByText('ja jestem')).toBeNull()
    expect(screen.queryByTestId('ratings')).toBeNull()
    expect(skip()).toBeInTheDocument()
    expect(showAnswer()).toBeInTheDocument()
    expect(screen.getByText('Пробел — открыть · 1–4 — оценка · S — пропустить')).toHaveClass('hidden', 'md:block')
  })

  it('clicking the card reveals the answer inside a non-interactive index card with the ratings below', async () => {
    renderPage()
    fireEvent.click(await screen.findByTestId('card-face'))

    const back = screen.getByTestId('card-back')
    expect(back.tagName).toBe('DIV')
    expect(back).toHaveClass('bg-surface', 'border-border-strong')
    expect(back).not.toHaveClass('cursor-pointer')
    expect(screen.getByTestId('card-meta')).toHaveTextContent('Исправление · PL · 5 сентября')
    expect(back.querySelector('s')).toHaveTextContent('ja jest')
    expect(back.querySelector('strong')).toHaveTextContent('ja jestem')
    expect(back).toHaveTextContent('спряжение być')
    expect(back).toHaveTextContent('ja jest… ja jestem')
    expect(back).toHaveTextContent('5 сентября · Анна')
    expect(screen.queryByRole('button', { name: 'Показать ответ' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Пропустить' })).toBeNull()

    const ratings = screen.getByTestId('ratings')
    expect(ratings.querySelectorAll('button')).toHaveLength(4)
    expect(ratings).toHaveTextContent('Снова1 минТрудно6 минХорошо10 минЛегко8 д')
  })

  it('the Show answer button reveals the answer too', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }))
    expect(screen.getByTestId('card-back')).toHaveTextContent('ja jestem')
  })

  it('rating Good saves the review and moves to the next card, then finishes the session inside an index card', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Хорошо' }))

    expect(reviewCard).toHaveBeenCalledWith(correction, 3)
    expect(screen.getByText('zeszyt')).toHaveClass('text-[28px]')
    expect(screen.getByText('Вспомни перевод и нажми, чтобы открыть')).toBeInTheDocument()
    expect(screen.getByTestId('card-meta')).toHaveTextContent('Слово · Моя карточка')
    expect(screen.getByText('Карточка 2 из 2 · 0 новых')).toBeInTheDocument()
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению1Новых0В колоде7')

    fireEvent.click(showAnswer())
    fireEvent.click(screen.getByRole('button', { name: 'Легко' }))
    expect(reviewCard).toHaveBeenCalledWith(vocab, 4)
    expect(screen.queryByText(/Карточка \d из/)).toBeNull()
    const done = screen.getByText('На сегодня всё.').parentElement!
    expect(done).toHaveClass('bg-surface', 'border-border-strong')
    expect(done).not.toHaveClass('cursor-pointer')
    expect(done).toHaveTextContent('Повторено за сессию — 2 карточки.')
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению0Новых0В колоде7')
  })

  it('Skip moves the card to the end of the queue without rating it; the progress stays put', async () => {
    renderPage()
    await screen.findByText('ja jest')
    fireEvent.click(skip())

    expect(reviewCard).not.toHaveBeenCalled()
    expect(screen.getByText('zeszyt')).toBeInTheDocument()
    expect(screen.queryByText('ja jest')).toBeNull()
    expect(screen.getByText('Карточка 1 из 2 · 1 новая')).toBeInTheDocument()
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению2Новых1В колоде7')

    fireEvent.click(skip())
    expect(screen.getByText('ja jest')).toBeInTheDocument()
    expect(reviewCard).not.toHaveBeenCalled()
  })

  it('the S key skips on both the face and the answer', async () => {
    renderPage()
    await screen.findByText('ja jest')
    fireEvent.keyDown(window, { key: 's' })
    expect(screen.getByText('zeszyt')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByTestId('card-back')).toHaveTextContent('тетрадь')
    fireEvent.keyDown(window, { key: 'S' })
    expect(screen.getByText('ja jest')).toBeInTheDocument()
    expect(screen.getByTestId('card-face')).toBeInTheDocument()
    expect(reviewCard).not.toHaveBeenCalled()
  })

  it('shows the empty state without a session counter when nothing is due', async () => {
    listDueCards.mockResolvedValue([])
    deckStats.mockResolvedValue({ due: 0, new: 0, total: 3 })
    renderPage()
    expect(await screen.findByText('На сегодня всё.')).toBeInTheDocument()
    expect(screen.queryByText(/Повторено за сессию/)).toBeNull()
  })

  it('space flips, keys 1–4 rate; digits do nothing before the flip', async () => {
    renderPage()
    await screen.findByText('ja jest')
    fireEvent.keyDown(window, { key: '3' })
    expect(reviewCard).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByTestId('card-back')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '1' })
    expect(reviewCard).toHaveBeenCalledWith(correction, 1)

    await screen.findByText('zeszyt')
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: '2' })
    expect(reviewCard).toHaveBeenCalledWith(vocab, 2)
  })

  it('keeps the card and shows the error under it when saving the review fails', async () => {
    reviewCard.mockRejectedValue(new ApiError('saveReview', 'network down'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Хорошо' }))

    expect(await screen.findByText('Не удалось сохранить оценку: network down')).toBeInTheDocument()
    expect(screen.getByTestId('card-back')).toHaveTextContent('ja jestem')
    expect(screen.getByText('Карточка 1 из 2 · 1 новая')).toBeInTheDocument()
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению2')
    expect(screen.queryByText('zeszyt')).toBeNull()
  })

  it('shows the load error', async () => {
    listDueCards.mockRejectedValue(new ApiError('loadCards', 'offline'))
    renderPage()
    expect(await screen.findByText('Не удалось загрузить карточки: offline')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('На сегодня всё.')).toBeNull())
  })
})
