import type { DrillItem } from '../../../supabase/functions/_shared/course-input.ts'
import { missCard } from './missCard'

const item = (prompt: string, answers: string[], note: string | null = null): DrillItem => ({ id: 'i', prompt, answers, note, hint: null })

it('puts the Russian prompt on the front and the Polish answer on the back', () => {
  expect(missCard(item('Я ищу ключ.', ['Szukam klucza'], 'szukać + D'), '0003-dopelniacz')).toEqual({
    type: 'vocab', original: 'Я ищу ключ.', corrected: 'Szukam klucza', explanation: 'szukać + D [0003-dopelniacz]', lang: 'pl',
  })
})

it('fills the gap so the back is a whole Polish sentence', () => {
  const c = missCard(item('Jutro ___ (my, mieć) gości. · *будущее*', ['będziemy mieli', 'będziemy mieć']), '0004-czas-przyszly')
  expect(c.original).toBe('Jutro ___ (my, mieć) gości. · будущее')
  expect(c.corrected).toBe('Jutro będziemy mieli gości.')
})

it('strips inline markup from the prompt', () => {
  expect(missCard(item('У меня **болит** {pl:głowa}', ['Boli mnie głowa']), 'x').original).toBe('У меня болит głowa')
})
