import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { JournalEntry } from '@/api/entries'

const listEntries = vi.fn()
const createManualEntry = vi.fn()
const updateEntry = vi.fn()
const softDeleteEntry = vi.fn()
const addToDeck = vi.fn()
const removeFromDeck = vi.fn()

vi.mock('@/api/entries', () => ({
  listEntries: (...args: unknown[]) => listEntries(...args),
  createManualEntry: (...args: unknown[]) => createManualEntry(...args),
  updateEntry: (...args: unknown[]) => updateEntry(...args),
  softDeleteEntry: (...args: unknown[]) => softDeleteEntry(...args),
}))
vi.mock('@/api/cards', () => ({
  addToDeck: (...args: unknown[]) => addToDeck(...args),
  removeFromDeck: (...args: unknown[]) => removeFromDeck(...args),
}))

import { JournalPage } from './JournalPage'

function entry(over: Partial<JournalEntry> & Pick<JournalEntry, 'id' | 'type' | 'original'>): JournalEntry {
  return {
    lesson_id: 'l1',
    user_id: 'u1',
    corrected: null,
    explanation: null,
    quote: null,
    created_at: '2026-09-05T10:00:00Z',
    deleted_at: null,
    inDeck: true,
    lesson: { id: 'l1', date: '2026-09-05', tutor: { name: 'Анна', language: 'pl' } },
    ...over,
  }
}

const rows: JournalEntry[] = [
  entry({ id: 'e1', type: 'correction', original: 'ja jest', corrected: 'ja jestem' }),
  entry({ id: 'e2', type: 'vocab', original: 'zeszyt', corrected: 'тетрадь', inDeck: false }),
  entry({ id: 'e3', type: 'rule', original: 'Po 5 dopełniacz', lesson_id: 'l2', lesson: { id: 'l2', date: '2026-09-01', tutor: { name: 'Марек', language: 'pl' } } }),
  entry({ id: 'e4', type: 'vocab', original: 'kot', corrected: 'кот', lesson_id: null, lesson: null }),
]

const renderPage = () =>
  render(
    <MemoryRouter>
      <JournalPage />
    </MemoryRouter>,
  )

describe('JournalPage', () => {
  beforeEach(() => {
    listEntries.mockReset().mockResolvedValue(rows)
    createManualEntry.mockReset()
    updateEntry.mockReset()
    softDeleteEntry.mockReset().mockResolvedValue(undefined)
    addToDeck.mockReset().mockResolvedValue(undefined)
    removeFromDeck.mockReset().mockResolvedValue(undefined)
  })

  it('groups entries by lesson with manual cards first and lessons newest first', async () => {
    renderPage()
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(headings).toEqual(['Мои карточки', '5 сентября · Анна', '1 сентября · Марек'])
    expect(listEntries).toHaveBeenCalledWith({ type: undefined, search: undefined })

    const anna = screen.getByRole('region', { name: '5 сентября · Анна' })
    expect(anna.querySelector('s')).toHaveTextContent('ja jest')
    expect(anna.querySelector('strong')).toHaveTextContent('ja jestem')
    expect(anna).toHaveTextContent('zeszyt — тетрадь')
    expect(screen.getByRole('region', { name: 'Мои карточки' })).toHaveTextContent('kot — кот')
  })

  it('re-queries with the type filter and the debounced search', async () => {
    renderPage()
    await screen.findByText('kot')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Все', 'Правки', 'Слова', 'Правила'])
    fireEvent.click(screen.getByRole('tab', { name: 'Правки' }))
    await waitFor(() => expect(listEntries).toHaveBeenLastCalledWith({ type: 'correction', search: undefined }))
    fireEvent.click(screen.getByRole('tab', { name: 'Слова' }))
    await waitFor(() => expect(listEntries).toHaveBeenLastCalledWith({ type: 'vocab', search: undefined }))

    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'kot' } })
    await waitFor(() => expect(listEntries).toHaveBeenLastCalledWith({ type: 'vocab', search: 'kot' }))
  })

  it('shows "nothing found" for an empty filtered result and the empty state otherwise', async () => {
    listEntries.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/Здесь будут все исправления/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Правила' }))
    expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument()
  })

  it('toggles deck membership optimistically and reverts on error', async () => {
    renderPage()
    await screen.findByText('kot')
    const jaJest = screen.getByText('ja jest').closest('li')!
    const remove = within(jaJest).getByRole('button', { name: 'Убрать из колоды', pressed: true })
    fireEvent.click(remove)
    expect(removeFromDeck).toHaveBeenCalledWith('e1')
    await waitFor(() => expect(remove).toHaveAttribute('aria-pressed', 'false'))
    expect(remove).toHaveAccessibleName('В колоду')

    addToDeck.mockRejectedValue(new Error('offline'))
    const zeszyt = screen.getByText('zeszyt').closest('li')!
    const add = within(zeszyt).getByRole('button', { name: 'В колоду', pressed: false })
    fireEvent.click(add)
    expect(addToDeck).toHaveBeenCalledWith('e2')
    expect(await screen.findByText('offline')).toBeInTheDocument()
    expect(add).toHaveAttribute('aria-pressed', 'false')
  })

  it('adds a manual card through the sheet and lists it under "Мои карточки"', async () => {
    const created = entry({ id: 'e9', type: 'vocab', original: 'pies', corrected: 'собака', explanation: 'zwierzę', lesson_id: null, lesson: null })
    createManualEntry.mockResolvedValue(created)
    renderPage()
    await screen.findByText('kot')

    fireEvent.click(screen.getByRole('button', { name: 'Добавить карточку' }))
    const dialog = screen.getByRole('dialog', { name: 'Новая карточка' })
    const submit = within(dialog).getByRole('button', { name: 'Добавить в колоду' })
    expect(submit).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Слово / фраза'), { target: { value: 'pies' } })
    fireEvent.change(within(dialog).getByLabelText('Перевод / как правильно'), { target: { value: 'собака' } })
    fireEvent.change(within(dialog).getByLabelText('Пояснение'), { target: { value: 'zwierzę' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(createManualEntry).toHaveBeenCalledWith({ type: 'vocab', original: 'pies', corrected: 'собака', explanation: 'zwierzę' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Мои карточки' })).toHaveTextContent('pies — собака'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('opens the same sheet to edit a row and soft-deletes it', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /ja jest/ }))
    const dialog = screen.getByRole('dialog', { name: 'Карточка' })
    expect(within(dialog).getByLabelText('Слово / фраза')).toHaveValue('ja jest')
    expect(within(dialog).getByRole('tab', { name: 'Исправление' })).toHaveAttribute('aria-selected', 'true')

    updateEntry.mockResolvedValue({ ...rows[0], corrected: 'ja jestem!' })
    fireEvent.change(within(dialog).getByLabelText('Перевод / как правильно'), { target: { value: 'ja jestem!' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(updateEntry).toHaveBeenCalledWith('e1', { type: 'correction', original: 'ja jest', corrected: 'ja jestem!', explanation: '' }))
    expect(await screen.findByText('ja jestem!')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /kot/ }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Карточка' })).getByRole('button', { name: 'Удалить' }))
    await waitFor(() => expect(softDeleteEntry).toHaveBeenCalledWith('e4'))
    await waitFor(() => expect(screen.queryByText('kot')).toBeNull())
    expect(screen.queryByRole('heading', { name: 'Мои карточки' })).toBeNull()
  })
})
