import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LevelDoc } from '@/api/level'

const getLevel = vi.fn()
vi.mock('@/api/level', () => ({ getLevel: () => getLevel() }))

import { LevelPage } from './LevelPage'

const doc: LevelDoc = {
  summary: { overall: 'Понимание B1, производство A2', verdict: 'Сегодня не сдал бы.', updated_on: '2026-09-27' },
  skills: [
    { key: 'sluchanie', cefr: 'B1', note: null },
    { key: 'pisanie', cefr: 'A2', note: 'кальки' },
    { key: 'mowienie', cefr: '?', note: 'Не измерено' },
  ],
  tests: [
    { id: 't1', date: '2026-09-27', title: 'Аркуш 2020', url: 'https://example.org/a.pdf', scores: { sluchanie: { got: 27.5, max: 30 }, pisanie: { got: 12, max: 30 } }, note: null },
    { id: 't2', date: '2026-12-27', title: 'Аркуш 2019', url: null, scores: { pisanie: { got: 18, max: 30 } }, note: null },
  ],
  topics: [
    { id: 'future', title: 'Будущее время', skill: 'gramatyka', status: 'in_progress', item_slug: '0004-czas-przyszly', note: '4 из 10' },
    { id: 'kalki', title: 'Кальки', skill: 'pisanie', status: 'open', item_slug: null, note: null },
  ],
  checkpoints: [{ id: 'dec', date: '2026-12-27', title: 'Второй аркуш', rule: 'ниже 40% → июнь', status: 'upcoming' }],
}

const renderPage = () => render(<MemoryRouter><LevelPage /></MemoryRouter>)

it('shows the latest score per skill against the pass mark', async () => {
  getLevel.mockResolvedValue(doc)
  renderPage()
  const pisanie = await screen.findByTestId('skill-pisanie')
  expect(within(pisanie).getByText('60%')).toHaveClass('text-ink-green')
  expect(within(screen.getByTestId('skill-sluchanie')).getByText('92%')).toBeInTheDocument()
  expect(within(screen.getByTestId('skill-mowienie')).getByText('—')).toBeInTheDocument()
})

it('lists tests newest first with the change since the previous one', async () => {
  getLevel.mockResolvedValue(doc)
  renderPage()
  const tests = await screen.findByTestId('level-tests')
  const rows = within(tests).getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('Аркуш 2019')
  expect(within(rows[0]).getByText('↑20')).toBeInTheDocument()
  expect(within(rows[1]).getByText('40%')).toHaveClass('text-pen-red')
  expect(within(rows[1]).getByRole('link', { name: 'Аркуш' })).toHaveAttribute('href', 'https://example.org/a.pdf')
})

it('links weak topics to the course item that works on them', async () => {
  getLevel.mockResolvedValue(doc)
  renderPage()
  const topic = await screen.findByTestId('topic-future')
  expect(within(topic).getByRole('link')).toHaveAttribute('href', '/course/0004-czas-przyszly')
  expect(within(screen.getByTestId('topic-kalki')).queryByRole('link')).toBeNull()
})

it('shows an empty state when no level is published', async () => {
  getLevel.mockResolvedValue(null)
  renderPage()
  expect(await screen.findByText(/Уровень пока не заполнен/)).toBeInTheDocument()
})
