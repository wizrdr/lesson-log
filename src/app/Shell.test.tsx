import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { setLang } from '@/i18n'
import { mockMatchMedia, type MatchMediaMock } from '@/test/matchMedia'
import { Shell } from './Shell'

const TABS = ['Уроки', 'Журнал', 'Повторение', 'Перед уроком']

function renderShell(width: number) {
  const mm = mockMatchMedia(width)
  const view = render(
    <MemoryRouter initialEntries={['/journal']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<p>Список</p>} />
          <Route path="/journal" element={<p>Журнал-контент</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  return { mm, ...view }
}

describe('Shell', () => {
  let mm: MatchMediaMock | null = null
  afterEach(() => {
    mm?.restore()
    mm = null
    setLang('ru')
  })

  it('renders the bottom tab bar with labels and no side nav on a phone', () => {
    ;({ mm } = renderShell(390))
    const bar = screen.getByTestId('tab-bar')
    expect(screen.queryByTestId('side-nav')).toBeNull()
    for (const label of TABS) expect(within(bar).getByRole('link', { name: label })).toHaveTextContent(label)
    expect(screen.getByText('Журнал-контент')).toBeInTheDocument()
    expect(screen.queryByText('Lesson Log')).toBeNull()
  })

  it('renders an icon-only side nav with aria-labels and titles on a tablet', () => {
    ;({ mm } = renderShell(834))
    const nav = screen.getByTestId('side-nav')
    expect(screen.queryByTestId('tab-bar')).toBeNull()
    for (const label of TABS) {
      const link = within(nav).getByRole('link', { name: label })
      expect(link).toHaveAttribute('title', label)
      expect(link).toHaveTextContent('')
    }
    expect(within(nav).queryByText('Lesson Log')).toBeNull()
    expect(within(nav).queryByRole('button')).toBeNull()
  })

  it('renders the side nav with logo, labels and the language switch on a desktop', () => {
    ;({ mm } = renderShell(1440))
    const nav = screen.getByTestId('side-nav')
    expect(screen.queryByTestId('tab-bar')).toBeNull()
    expect(within(nav).getByText('Lesson Log')).toBeInTheDocument()
    for (const label of TABS) expect(within(nav).getByRole('link', { name: label })).toHaveTextContent(label)
    expect(within(nav).getByRole('link', { name: 'Журнал' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(within(nav).getByRole('button', { name: 'English' }))
    expect(within(nav).getByRole('link', { name: 'Journal' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Русский' })).toBeInTheDocument()
  })

  it('switches between tab bar and side nav when the viewport changes', () => {
    ;({ mm } = renderShell(390))
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
    act(() => mm!.set(1440))
    expect(screen.queryByTestId('tab-bar')).toBeNull()
    expect(screen.getByTestId('side-nav')).toBeInTheDocument()
  })
})
