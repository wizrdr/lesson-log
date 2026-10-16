import type { DrillItem } from '../../../supabase/functions/_shared/course-input.ts'
import type { CardInput } from '../../../supabase/functions/_shared/cards-input.ts'
import { parseInline, plainText } from './markup'

const GAP = /_{3,}(\s*\([^)]*\))?/

export function hasGap(prompt: string): boolean {
  return GAP.test(prompt)
}

export function fillGap(prompt: string, answer: string): string {
  return prompt.replace(GAP, answer)
}

// A gap task without an authored card has no word to recall, so it makes no card.
export function missCard(item: DrillItem, lessonSlug: string): CardInput | null {
  const prompt = plainText(parseInline(item.prompt)).trim()
  const answer = item.answers[0]
  const base = prompt.split(' · ')[0].trim()
  const gap = hasGap(base)
  const sentence = gap ? fillGap(base, answer).replace(/\s*\([^)]*\)/g, '') : answer
  if (item.card) {
    const explanation = [gap ? sentence : null, `[${lessonSlug}]`].filter(Boolean).join(' ')
    return { type: 'vocab', original: item.card.front, corrected: item.card.back, explanation, lang: 'pl' }
  }
  if (gap) return null
  const explanation = [item.note, `[${lessonSlug}]`].filter(Boolean).join(' ')
  return { type: 'vocab', original: prompt, corrected: sentence, explanation, lang: 'pl' }
}
