import type { DrillItem, ItemCard } from '../../../supabase/functions/_shared/course-input.ts'
import { missCard } from './missCard'

const item = (prompt: string, answers: string[], note: string | null = null, card: ItemCard | null = null): DrillItem => ({ id: 'i', prompt, answers, note, hint: null, card })

it('puts the Russian prompt on the front and the Polish answer on the back', () => {
  expect(missCard(item('Я ищу ключ.', ['Szukam klucza'], 'szukać + D'), '0003-dopelniacz')).toEqual({
    type: 'vocab', original: 'Я ищу ключ.', corrected: 'Szukam klucza', explanation: 'szukać + D [0003-dopelniacz]', lang: 'pl',
  })
})

it('strips inline markup from the prompt', () => {
  expect(missCard(item('У меня **болит** {pl:głowa}', ['Boli mnie głowa']), 'x')?.original).toBe('У меня болит głowa')
})

it('makes no card from a gap task without an authored card', () => {
  expect(missCard(item('Irena: Lubię tłumaczyć polską poezję, a na środę muszę ___ ten wiersz.', ['przetłumaczyć']), 'x')).toBeNull()
})

it('uses the authored card and keeps the filled sentence as an example', () => {
  const card = { front: 'перевести (сов. вид) ≠ wytłumaczyć — объяснить', back: 'przetłumaczyć' }
  expect(missCard(item('Irena: na środę muszę ___ ten wiersz. · *вид*', ['przetłumaczyć'], 'note', card), '0006-czas-przeszly')).toEqual({
    type: 'vocab', original: card.front, corrected: 'przetłumaczyć', explanation: 'Irena: na środę muszę przetłumaczyć ten wiersz. [0006-czas-przeszly]', lang: 'pl',
  })
})

it('drops hints in parentheses from the example sentence', () => {
  const card = { front: 'мочь (условное, вежливо)', back: 'mógłby' }
  expect(missCard(item('Czy ___ pan mówić trochę wolniej? (móc)', ['mógłby'], null, card), 'x')?.explanation).toBe('Czy mógłby pan mówić trochę wolniej? [x]')
})
