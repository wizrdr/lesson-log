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
const vocab = card({ id: 'e2', type: 'vocab', original: 'zeszyt', corrected: 'тетрадь', lesson: null })

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  )

describe('ReviewPage', () => {
  beforeEach(() => {
    listDueCards.mockReset().mockResolvedValue([correction, vocab])
    deckStats.mockReset().mockResolvedValue({ due: 2, new: 2, total: 7 })
    reviewCard.mockReset().mockImplementation((c: DueCard) => Promise.resolve(c))
  })

  it('shows the counters and the face of the first card; flip reveals the answer and the ratings', async () => {
    renderPage()
    expect(await screen.findByTestId('deck-stats')).toHaveTextContent('К повторению2Новых2В колоде7')
    expect(screen.getByText('ja jest')).toBeInTheDocument()
    expect(screen.getByText('Как правильно?')).toBeInTheDocument()
    expect(screen.queryByText('ja jestem')).toBeNull()
    expect(screen.queryByTestId('ratings')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Показать ответ' }))
    const back = screen.getByTestId('card-back')
    expect(back.querySelector('s')).toHaveTextContent('ja jest')
    expect(back.querySelector('strong')).toHaveTextContent('ja jestem')
    expect(back).toHaveTextContent('спряжение być')
    expect(back).toHaveTextContent('ja jest… ja jestem')
    expect(back).toHaveTextContent('5 сентября · Анна')

    const ratings = screen.getByTestId('ratings')
    expect(ratings.querySelectorAll('button')).toHaveLength(4)
    expect(ratings).toHaveTextContent('Снова1 минТрудно6 минХорошо10 минЛегко8 д')
  })

  it('rating Good saves the review and moves to the next card, then finishes the session', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Хорошо' }))

    expect(reviewCard).toHaveBeenCalledWith(correction, 3)
    expect(screen.getByText('zeszyt')).toBeInTheDocument()
    expect(screen.getByText('Перевод?')).toBeInTheDocument()
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению1Новых1В колоде7')

    fireEvent.click(screen.getByRole('button', { name: 'Показать ответ' }))
    expect(screen.getByTestId('card-back')).toHaveTextContent('Моя карточка')
    fireEvent.click(screen.getByRole('button', { name: 'Легко' }))
    expect(reviewCard).toHaveBeenCalledWith(vocab, 4)
    expect(screen.getByText('На сегодня всё.')).toBeInTheDocument()
    expect(screen.getByText('Повторено за сессию — 2 карточки.')).toBeInTheDocument()
    expect(screen.getByTestId('deck-stats')).toHaveTextContent('К повторению0Новых0В колоде7')
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

  it('keeps the card and shows the error when saving the review fails', async () => {
    reviewCard.mockRejectedValue(new ApiError('saveReview', 'network down'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ответ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Хорошо' }))

    expect(await screen.findByText('Не удалось сохранить оценку: network down')).toBeInTheDocument()
    expect(screen.getByTestId('card-back')).toHaveTextContent('ja jestem')
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
