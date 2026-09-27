import type { Score } from '../../../supabase/functions/_shared/level-input.ts'

const PASS = 50

export function pct(s: Score): number {
  return Math.round((s.got / s.max) * 100)
}

export function tone(p: number): { text: string; bar: string } {
  if (p < PASS) return { text: 'text-pen-red', bar: 'bg-pen-red' }
  if (p < 60) return { text: 'text-amber-text', bar: 'bg-amber' }
  return { text: 'text-ink-green', bar: 'bg-ink-green' }
}
