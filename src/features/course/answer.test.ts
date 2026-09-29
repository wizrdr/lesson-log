import { checkAnswer, hintFor, normalize } from './answer'

describe('checkAnswer', () => {
  const answers = ['Jestem z Gdańska, a on z Londynu', 'Jestem z Gdańska, a on jest z Londynu']

  it('accepts any listed variant ignoring case, spaces and punctuation', () => {
    expect(checkAnswer('  jestem z gdańska a on jest z londynu! ', answers)).toEqual({ kind: 'ok', answer: answers[1] })
  })

  it('ignores a leading "ja"', () => {
    expect(checkAnswer('Ja szukam klucza', ['Szukam klucza']).kind).toBe('ok')
  })

  it('treats missing diacritics as near, not wrong', () => {
    expect(checkAnswer('Jestem z Gdanska a on z Londynu', answers)).toEqual({ kind: 'near', answer: answers[0] })
  })

  it('rejects a wrong form', () => {
    expect(checkAnswer('Jestem z Gdańsku', answers)).toEqual({ kind: 'bad' })
  })

  it('reports empty input separately', () => {
    expect(checkAnswer('  . ', answers)).toEqual({ kind: 'empty' })
  })

  it('handles sentence-internal punctuation', () => {
    expect(checkAnswer('Przepraszam. Nie zrozumiałem, proszę powtórzyć wolniej.', ['Przepraszam, nie zrozumiałem, proszę powtórzyć wolniej']).kind).toBe('ok')
  })
})

describe('hintFor', () => {
  it('hides the ending of every word longer than three letters', () => {
    expect(hintFor('będziemy mieli')).toBe('będzi··· mie··')
    expect(hintFor('Potrzebuję recepty')).toBe('Potrze···· rece···')
    expect(hintFor('Czy możecie przyjść do nas')).toBe('Czy może··· przy··· do nas')
    expect(hintFor('Nie wiem.')).toBe('Nie wi··.')
  })
})

describe('normalize', () => {
  it('collapses dashes and whitespace', () => {
    expect(normalize('Nie — ma   cukru')).toBe('nie ma cukru')
  })
})
