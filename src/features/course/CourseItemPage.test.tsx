import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CourseItem, ProgressMap } from '@/api/course'

const getCourseItem = vi.fn()
const loadProgress = vi.fn()
const saveProgress = vi.fn()
const importCards = vi.fn()

vi.mock('@/api/course', () => ({
  getCourseItem: (slug: string) => getCourseItem(slug),
  loadProgress: (id: string) => loadProgress(id),
  saveProgress: (...args: unknown[]) => saveProgress(...args),
  importCards: (cards: unknown) => importCards(cards),
}))

import { CARDS_MARKER, CourseItemPage } from './CourseItemPage'

const lesson: CourseItem = {
  id: 'item-3',
  slug: '0003-dopelniacz',
  kind: 'lesson',
  position: 3,
  title: 'Nie ma cukru',
  subtitle: 'Dopełniacz',
  week_start: null,
  body: [
    { id: 'p-1', type: 'text', md: 'Правило: {pl:do poniedziałk**u**}.' },
    {
      id: 'dopelniacz', type: 'drill', title: 'Тренажёр', bank: ['cukru'],
      items: [
        { id: 'i1', prompt: 'Сахара нет.', answers: ['Nie ma cukru', 'Cukru nie ma'], note: 'Вещество → -u', hint: 'Сахар — вещество.' },
        { id: 'i2', prompt: 'Я ищу ключ.', answers: ['Szukam klucza'], note: 'szukać + D', hint: null },
        { id: 'i3', prompt: 'Я учу польский.', answers: ['Uczę się polskiego'], note: null, hint: null },
      ],
    },
    { id: 'q1', type: 'quiz', question: 'od ___ do piątku', options: [{ key: 'a', text: 'poniedziałka' }, { key: 'b', text: 'poniedziałku' }], answer: 'b', ok: 'Дни на -u.', bad: 'Нет.' },
    { id: 'hw', type: 'checklist', title: 'Задание', items: [{ id: 'c1', md: 'Диктант' }] },
  ],
  cards: [{ type: 'vocab', original: 'сахара нет', corrected: 'Nie ma cukru', explanation: null, lang: 'pl' }],
}

function renderAt(progress: ProgressMap = { [CARDS_MARKER]: { imported: true } }) {
  getCourseItem.mockResolvedValue(lesson)
  loadProgress.mockResolvedValue(progress)
  return render(
    <MemoryRouter initialEntries={['/course/0003-dopelniacz']}>
      <Routes>
        <Route path="/course/:slug" element={<CourseItemPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const itemRow = (id: string) => screen.getByTestId(`item-${id}`)
const answer = (id: string, text: string) => {
  const input = within(itemRow(id)).getByRole('textbox')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('CourseItemPage', () => {
  beforeEach(() => {
    getCourseItem.mockReset()
    loadProgress.mockReset()
    saveProgress.mockReset().mockResolvedValue(undefined)
    importCards.mockReset().mockResolvedValue({ created: 1, skipped: 0 })
  })

  it('renders the lesson with inline markup', async () => {
    renderAt()
    expect(await screen.findByRole('heading', { name: 'Nie ma cukru' })).toBeInTheDocument()
    const pl = screen.getByText('Правило:', { exact: false }).querySelector('[lang="pl"]')
    expect(pl).toHaveTextContent('do poniedziałku')
    expect(pl?.querySelector('strong')).toHaveTextContent('u')
    expect(getCourseItem).toHaveBeenCalledWith('0003-dopelniacz')
  })

  it('restores saved drill progress', async () => {
    renderAt({ [CARDS_MARKER]: { imported: true }, dopelniacz: { items: { i1: { value: 'Nie ma cukru', tries: 0, verdict: 'ok', hint: 0 } } } })
    await screen.findByTestId('drill-dopelniacz')
    expect(itemRow('i1')).toHaveAttribute('data-verdict', 'ok')
    expect(screen.getByTestId('drill-score')).toHaveTextContent('1 из 3')
  })

  it('saves a correct answer as progress of the block', async () => {
    renderAt()
    await screen.findByTestId('drill-dopelniacz')
    answer('i1', 'cukru nie ma')
    expect(itemRow('i1')).toHaveAttribute('data-verdict', 'ok')
    expect(saveProgress).toHaveBeenCalledWith('item-3', 'dopelniacz', {
      items: { i1: { value: 'Cukru nie ma', tries: 0, verdict: 'ok', hint: 0 } },
    })
  })

  it('treats missing diacritics as near, does not count it and does not make a card', async () => {
    renderAt()
    await screen.findByTestId('drill-dopelniacz')
    answer('i3', 'Ucze sie polskiego')
    expect(itemRow('i3')).toHaveAttribute('data-verdict', 'near')
    expect(within(itemRow('i3')).getByText('Форма верная, диакритика нет: Uczę się polskiego')).toBeInTheDocument()
    answer('i3', 'Ucze sie polskiego')
    expect(screen.getByTestId('drill-score')).toHaveTextContent('0 из 3')
    expect(importCards).not.toHaveBeenCalled()
    answer('i3', 'Uczę się polskiego')
    expect(screen.getByTestId('drill-score')).toHaveTextContent('1 из 3')
  })

  it('turns two wrong answers into exactly one correction card', async () => {
    renderAt()
    await screen.findByTestId('drill-dopelniacz')
    answer('i2', 'Szukam klucz')
    expect(importCards).not.toHaveBeenCalled()
    answer('i2', 'Szukam kluczu')
    answer('i2', 'Szukam kluczem')
    await waitFor(() => expect(importCards).toHaveBeenCalledTimes(1))
    expect(importCards).toHaveBeenCalledWith([
      { type: 'correction', original: 'Szukam kluczu', corrected: 'Szukam klucza', explanation: 'szukać + D [0003-dopelniacz]', lang: 'pl' },
    ])
    expect(within(itemRow('i2')).getByText(/Правильно: Szukam klucza/)).toBeInTheDocument()
  })

  it('does not create a card when the learner used a hint', async () => {
    renderAt()
    await screen.findByTestId('drill-dopelniacz')
    fireEvent.click(within(itemRow('i2')).getByRole('button', { name: 'Подсказка' }))
    expect(within(itemRow('i2')).getByText('Первые буквы: S····· k·····')).toBeInTheDocument()
    answer('i2', 'Szukam klucz')
    answer('i2', 'Szukam kluczu')
    expect(importCards).not.toHaveBeenCalled()
  })

  it('imports lesson cards on the first open and records the marker', async () => {
    renderAt({})
    await waitFor(() => expect(importCards).toHaveBeenCalledWith(lesson.cards))
    await waitFor(() => expect(saveProgress).toHaveBeenCalledWith('item-3', CARDS_MARKER, { imported: true, created: 1, skipped: 0 }))
    expect(await screen.findByText('В колоду добавлено: 1 карточка')).toBeInTheDocument()
  })

  it('does not import again once the marker exists', async () => {
    renderAt()
    await screen.findByTestId('drill-dopelniacz')
    expect(importCards).not.toHaveBeenCalled()
  })

  it('saves quiz picks and checklist ticks', async () => {
    renderAt()
    await screen.findByTestId('quiz-q1')
    fireEvent.click(screen.getByRole('button', { name: 'poniedziałka' }))
    fireEvent.click(screen.getByRole('button', { name: 'poniedziałku' }))
    expect(saveProgress).toHaveBeenLastCalledWith('item-3', 'q1', { picked: ['a', 'b'] })
    expect(screen.getByText(/Со второй попытки/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(saveProgress).toHaveBeenLastCalledWith('item-3', 'hw', { done: { c1: true } })
  })

  it('anchors the visually hidden checkbox so it cannot stretch the page scroll', async () => {
    renderAt()
    await screen.findByTestId('checklist-hw')
    expect(screen.getByRole('checkbox').closest('label')).toHaveClass('relative')
  })

  it('rolls back and shows an error when saving fails', async () => {
    saveProgress.mockRejectedValue(new Error('offline'))
    renderAt()
    await screen.findByTestId('checklist-hw')
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked())
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
