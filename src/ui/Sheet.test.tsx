import { fireEvent, render, screen } from '@testing-library/react'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} onClose={() => {}}>
        <p>Содержимое</p>
      </Sheet>,
    )
    expect(screen.queryByText('Содержимое')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders children, title and footer when open', () => {
    render(
      <Sheet open onClose={() => {}} title="Заголовок" footer={<button type="button">Готово</button>}>
        <p>Содержимое</p>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Заголовок' })).toBeInTheDocument()
    expect(screen.getByText('Содержимое')).toBeInTheDocument()
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(document.body).toHaveClass('sheet-open')
  })

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose}>
        <p>Содержимое</p>
      </Sheet>,
    )
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose}>
        <p>Содержимое</p>
      </Sheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focuses the first focusable element on open', () => {
    render(
      <Sheet open onClose={() => {}}>
        <input aria-label="Название" />
      </Sheet>,
    )
    expect(screen.getByLabelText('Название')).toHaveFocus()
  })
})
