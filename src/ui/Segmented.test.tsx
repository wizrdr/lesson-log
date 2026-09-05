import { fireEvent, render, screen } from '@testing-library/react'
import { Segmented } from './Segmented'

const options = ['Все', 'Правки', 'Слова', 'Правила'].map((label) => ({ value: label, label }))

describe('Segmented', () => {
  it('stretches to full width with four equal flex-1 tabs', () => {
    render(<Segmented options={options} value="Все" onChange={() => {}} />)
    const list = screen.getByRole('tablist')
    expect(list).toHaveClass('flex', 'w-full')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    for (const tab of tabs) expect(tab).toHaveClass('flex-1', 'min-w-0', 'whitespace-nowrap')
    expect(screen.getByRole('tab', { name: 'Все' })).toHaveAttribute('aria-selected', 'true')
  })

  it('reports the clicked value', () => {
    const onChange = vi.fn()
    render(<Segmented options={options} value="Все" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Правки' }))
    expect(onChange).toHaveBeenCalledWith('Правки')
  })
})
