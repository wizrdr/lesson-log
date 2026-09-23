import { parseFlow, parseInline, plainText, safeHref } from './markup'

describe('parseInline', () => {
  it('parses polish spans with nested bold', () => {
    expect(parseInline('Не {pl:do poniedziałk**u**}!')).toEqual([
      { t: 'text', v: 'Не ' },
      { t: 'pl', c: [{ t: 'text', v: 'do poniedziałk' }, { t: 'strong', c: [{ t: 'text', v: 'u' }] }] },
      { t: 'text', v: '!' },
    ])
  })

  it('parses italic, code, say and links', () => {
    expect(parseInline('*курсив* `rz/ż` {say:Nie ma cukru.} [с. 38](https://x.pl/a.pdf#page=37)')).toEqual([
      { t: 'em', c: [{ t: 'text', v: 'курсив' }] },
      { t: 'text', v: ' ' },
      { t: 'code', v: 'rz/ż' },
      { t: 'text', v: ' ' },
      { t: 'say', v: 'Nie ma cukru.' },
      { t: 'text', v: ' ' },
      { t: 'link', href: 'https://x.pl/a.pdf#page=37', c: [{ t: 'text', v: 'с. 38' }] },
    ])
  })

  it('keeps bold inside italic', () => {
    expect(parseInline('*a **b** c*')).toEqual([
      { t: 'em', c: [{ t: 'text', v: 'a ' }, { t: 'strong', c: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' c' }] },
    ])
  })

  it('leaves unmatched markers as text', () => {
    expect(parseInline('5 * 3 {pl:open')).toEqual([{ t: 'text', v: '5 * 3 {pl:open' }])
  })

  it('turns newlines into breaks', () => {
    expect(parseInline('a\nb')).toEqual([{ t: 'text', v: 'a' }, { t: 'br' }, { t: 'text', v: 'b' }])
  })
})

describe('parseFlow', () => {
  it('splits paragraphs and lists', () => {
    expect(parseFlow('Первый.\n\n- один\n- два\n\nТретий')).toEqual([
      { t: 'p', c: [{ t: 'text', v: 'Первый.' }] },
      { t: 'ul', items: [[{ t: 'text', v: 'один' }], [{ t: 'text', v: 'два' }]] },
      { t: 'p', c: [{ t: 'text', v: 'Третий' }] },
    ])
  })
})

describe('plainText', () => {
  it('drops markup and speech tokens', () => {
    expect(plainText(parseInline('**Nie** {pl:ma} *cukru*{say:x}'))).toBe('Nie ma cukru')
  })
})

describe('safeHref', () => {
  it('allows app paths and http(s)/mailto links', () => {
    expect(safeHref('/course/wymowa')).toEqual({ kind: 'internal', href: '/course/wymowa' })
    expect(safeHref('https://nawa.gov.pl/a.pdf#page=47')?.kind).toBe('external')
    expect(safeHref('mailto:a@b.pl')?.kind).toBe('external')
  })

  it('rejects script schemes, protocol-relative and garbage', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<script>1</script>')).toBeNull()
    expect(safeHref('//evil.example/x')).toBeNull()
    expect(safeHref('/\\evil.example/x')).toBeNull()
    expect(safeHref('not a url')).toBeNull()
  })
})
