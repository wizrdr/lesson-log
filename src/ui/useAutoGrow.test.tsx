import { render, screen } from '@testing-library/react'
import { Textarea } from './Textarea'

const LINE = 24
const PADDING = 22

function mockMetrics() {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        lineHeight: `${LINE}px`,
        fontSize: '16px',
        paddingTop: '10px',
        paddingBottom: '10px',
        borderTopWidth: '1px',
        borderBottomWidth: '1px',
      }) as CSSStyleDeclaration,
  )
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return PADDING + LINE * this.value.split('\n').length
    },
  })
}

describe('useAutoGrow via Textarea autoGrow', () => {
  beforeEach(mockMetrics)
  afterEach(() => {
    vi.restoreAllMocks()
    delete (HTMLTextAreaElement.prototype as { scrollHeight?: number }).scrollHeight
  })

  it('grows with the content between 1 and 4 rows', () => {
    const view = render(<Textarea aria-label="Поле" autoGrow value="одна" onChange={() => {}} />)
    const el = screen.getByLabelText('Поле') as HTMLTextAreaElement
    expect(el.rows).toBe(1)

    view.rerender(<Textarea aria-label="Поле" autoGrow value={'раз\nдва\nтри'} onChange={() => {}} />)
    expect(el.rows).toBe(3)

    view.rerender(<Textarea aria-label="Поле" autoGrow value={'1\n2\n3\n4\n5\n6'} onChange={() => {}} />)
    expect(el.rows).toBe(4)

    view.rerender(<Textarea aria-label="Поле" autoGrow value="" onChange={() => {}} />)
    expect(el.rows).toBe(1)
  })

  it('keeps fixed rows without autoGrow', () => {
    render(<Textarea aria-label="Поле" rows={2} value={'1\n2\n3\n4\n5'} onChange={() => {}} />)
    expect((screen.getByLabelText('Поле') as HTMLTextAreaElement).rows).toBe(2)
  })
})
