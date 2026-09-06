import { fireEvent, render, screen } from '@testing-library/react'
import { IndexCard } from './IndexCard'

describe('IndexCard', () => {
  it('renders a full-width button with hover and focus affordances when interactive', () => {
    const onClick = vi.fn()
    render(
      <IndexCard interactive onClick={onClick}>
        zeszyt
      </IndexCard>,
    )
    const card = screen.getByRole('button', { name: 'zeszyt' })
    expect(card).toHaveAttribute('type', 'button')
    expect(card).toHaveClass('w-full', 'text-left', 'cursor-pointer', 'hover:border-ink', 'active:translate-y-0', 'focus-ring')
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders a plain div (or the given element) without button semantics otherwise', () => {
    const { rerender } = render(<IndexCard data-testid="card">zeszyt</IndexCard>)
    let card = screen.getByTestId('card')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('bg-surface', 'border-border-strong', 'shadow-card')
    expect(card).not.toHaveClass('cursor-pointer')
    expect(screen.queryByRole('button')).toBeNull()

    rerender(
      <IndexCard as="section" data-testid="card">
        zeszyt
      </IndexCard>,
    )
    card = screen.getByTestId('card')
    expect(card.tagName).toBe('SECTION')
  })
})
