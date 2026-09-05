import { fireEvent, render, screen } from '@testing-library/react'
import { WeekdayPicker, type Weekday } from './WeekdayPicker'

describe('WeekdayPicker', () => {
  it('renders 7 toggles with aria-pressed', () => {
    render(<WeekdayPicker value={[1, 7]} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)
    expect(buttons.map((b) => b.textContent)).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'])
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[6]).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds a day keeping ISO order', () => {
    const onChange = vi.fn<(d: Weekday[]) => void>()
    render(<WeekdayPicker value={[5, 1]} onChange={onChange} />)
    fireEvent.click(screen.getByText('ср'))
    expect(onChange).toHaveBeenCalledWith([1, 3, 5])
  })

  it('removes an already selected day', () => {
    const onChange = vi.fn<(d: Weekday[]) => void>()
    render(<WeekdayPicker value={[1, 3, 5]} onChange={onChange} />)
    fireEvent.click(screen.getByText('ср'))
    expect(onChange).toHaveBeenCalledWith([1, 5])
  })
})
