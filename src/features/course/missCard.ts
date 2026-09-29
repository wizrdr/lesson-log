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

// Front is the task as the learner saw it, back is the correct Polish — never the learner's wrong attempt.
export function missCard(item: DrillItem, lessonSlug: string): CardInput {
  const prompt = plainText(parseInline(item.prompt)).trim()
  const answer = item.answers[0]
  const base = prompt.split(' · ')[0].trim()
  const corrected = hasGap(base) ? fillGap(base, answer).replace(/\s*\([^)]*\)/g, '') : answer
  const explanation = [item.note, `[${lessonSlug}]`].filter(Boolean).join(' ')
  return { type: 'vocab', original: prompt, corrected, explanation, lang: 'pl' }
}
