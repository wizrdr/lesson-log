import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Entry } from '@/api/types'

const createManualEntry = vi.fn()
const updateEntry = vi.fn()

vi.mock('@/api/entries', () => ({
  createManualEntry: (...args: unknown[]) => createManualEntry(...args),
  updateEntry: (...args: unknown[]) => updateEntry(...args),
  softDeleteEntry: vi.fn(),
}))

import { EntrySheet } from './EntrySheet'

const entry: Entry = {
  id: 'e1',
  lesson_id: null,
  user_id: 'u1',
  type: 'vocab',
  original: 'notebook',
  corrected: 'тетрадь',
  explanation: null,
  quote: null,
  lang: 'en',
  created_at: '2026-09-06T10:00:00Z',
  deleted_at: null,
}

const noop = () => {}

describe('EntrySheet language', () => {
  beforeEach(() => {
    createManualEntry.mockReset().mockResolvedValue({ ...entry, inDeck: true, lesson: null })
    updateEntry.mockReset().mockResolvedValue(entry)
  })

  it('defaults to no language and offers PL / EN / —', () => {
    render(<EntrySheet open entry={null} onClose={noop} onCreated={noop} onUpdated={noop} onDeleted={noop} />)
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(tabs).toEqual(['Исправление', 'Слово', 'Правило', 'PL', 'EN', '—'])
    expect(screen.getByRole('tab', { name: '—' })).toHaveAttribute('aria-selected', 'true')
  })

  it('sends the picked language on create', async () => {
    render(<EntrySheet open entry={null} onClose={noop} onCreated={noop} onUpdated={noop} onDeleted={noop} />)
    fireEvent.change(screen.getByLabelText('Слово / фраза'), { target: { value: 'zeszyt' } })
    fireEvent.click(screen.getByRole('tab', { name: 'PL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Добавить в колоду' }))
    await waitFor(() => expect(createManualEntry).toHaveBeenCalledWith({ type: 'vocab', original: 'zeszyt', corrected: '', explanation: '', lang: 'pl' }))
  })

  it('preselects the saved language and can clear it', async () => {
    render(<EntrySheet open entry={entry} onClose={noop} onCreated={noop} onUpdated={noop} onDeleted={noop} />)
    expect(screen.getByRole('tab', { name: 'EN' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: '—' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(updateEntry).toHaveBeenCalledWith('e1', { type: 'vocab', original: 'notebook', corrected: 'тетрадь', explanation: '', lang: null }))
  })
})
