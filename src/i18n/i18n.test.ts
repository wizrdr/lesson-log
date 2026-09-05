import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider, detectLang, setLang, translate } from './index'
import { en } from './en'
import { ru } from './ru'

afterEach(() => {
  setLang('ru')
  localStorage.setItem('ll.lang', 'ru')
})

describe('dictionaries', () => {
  it('have the same keys in ru and en', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
  })

  it('have no empty values', () => {
    for (const dict of [ru, en]) {
      for (const value of Object.values(dict)) {
        if (typeof value === 'string') expect(value).not.toBe('')
        else expect(value.other).not.toBe('')
      }
    }
  })
})

describe('translate', () => {
  it('substitutes {params}', () => {
    expect(translate('ru')('lessons.dueToday', { cards: '3 карточки' })).toBe('К повторению сегодня — 3 карточки.')
    expect(translate('en')('lesson.review', { cards: '4 cards' })).toBe('Review 4 cards')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(translate('ru')('lessons.dueToday')).toBe('К повторению сегодня — {cards}.')
  })

  it('picks Russian plural forms via Intl.PluralRules', () => {
    const t = translate('ru')
    expect(t.plural('entries', 1)).toBe('1 запись')
    expect(t.plural('entries', 2)).toBe('2 записи')
    expect(t.plural('entries', 5)).toBe('5 записей')
    expect(t.plural('entries', 21)).toBe('21 запись')
    expect(t.plural('cards', 11)).toBe('11 карточек')
  })

  it('picks English plural forms', () => {
    const t = translate('en')
    expect(t.plural('entries', 1)).toBe('1 entry')
    expect(t.plural('entries', 2)).toBe('2 entries')
    expect(t.plural('cards', 0)).toBe('0 cards')
  })
})

describe('language detection', () => {
  function withNavigatorLanguage(language: string, fn: () => void) {
    Object.defineProperty(navigator, 'language', { value: language, configurable: true })
    try {
      fn()
    } finally {
      Reflect.deleteProperty(navigator, 'language')
    }
  }

  it('prefers the saved language', () => {
    localStorage.setItem('ll.lang', 'en')
    withNavigatorLanguage('ru-RU', () => expect(detectLang()).toBe('en'))
  })

  it('falls back to navigator.language', () => {
    localStorage.removeItem('ll.lang')
    withNavigatorLanguage('ru-BY', () => expect(detectLang()).toBe('ru'))
    withNavigatorLanguage('pl-PL', () => expect(detectLang()).toBe('en'))
    withNavigatorLanguage('en-US', () => expect(detectLang()).toBe('en'))
  })

  it('ignores garbage in storage', () => {
    localStorage.setItem('ll.lang', 'de')
    withNavigatorLanguage('ru', () => expect(detectLang()).toBe('ru'))
  })
})

describe('LanguageProvider', () => {
  it('sets <html lang> and persists the choice on setLang', () => {
    render(createElement(LanguageProvider, null, null))
    expect(document.documentElement.lang).toBe('ru')

    act(() => setLang('en'))
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('ll.lang')).toBe('en')

    act(() => setLang('ru'))
    expect(document.documentElement.lang).toBe('ru')
  })
})
