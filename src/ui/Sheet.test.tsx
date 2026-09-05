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

describe('Sheet focus management', () => {
  it('keeps the autoFocus target instead of grabbing the first focusable', () => {
    render(
      <Sheet open onClose={() => {}}>
        <input aria-label="Первое" />
        <input aria-label="Второе" autoFocus />
      </Sheet>,
    )
    expect(screen.getByLabelText('Второе')).toHaveFocus()
  })

  it('loops Tab and Shift+Tab inside the panel', () => {
    render(
      <Sheet open onClose={() => {}} title="Форма" footer={<button type="button">Готово</button>}>
        <input aria-label="Поле" />
      </Sheet>,
    )
    const field = screen.getByLabelText('Поле')
    const done = screen.getByText('Готово')
    expect(field).toHaveFocus()

    done.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(done).toHaveFocus()
  })

  it('returns focus to the element that opened it', () => {
    const view = render(
      <>
        <button type="button">Открыть</button>
        <Sheet open={false} onClose={() => {}}>
          <input aria-label="Поле" />
        </Sheet>
      </>,
    )
    const opener = screen.getByText('Открыть')
    opener.focus()
    view.rerender(
      <>
        <button type="button">Открыть</button>
        <Sheet open onClose={() => {}}>
          <input aria-label="Поле" />
        </Sheet>
      </>,
    )
    expect(screen.getByLabelText('Поле')).toHaveFocus()
    view.rerender(
      <>
        <button type="button">Открыть</button>
        <Sheet open={false} onClose={() => {}}>
          <input aria-label="Поле" />
        </Sheet>
      </>,
    )
    expect(opener).toHaveFocus()
  })
})
