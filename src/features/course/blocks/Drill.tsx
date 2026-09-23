import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { DrillBlock, DrillItem } from '../../../../supabase/functions/_shared/course-input.ts'
import { useT } from '@/i18n'
import { Button, cn, Input } from '@/ui'
import { checkAnswer, hintFor } from '../answer'
import type { BlockState } from '@/api/course'

export interface DrillItemState {
  value: string
  tries: number
  verdict: 'ok' | 'near' | 'bad' | null
  hint: 0 | 1 | 2 | 3
  carded?: boolean
}

export type DrillState = { items?: Record<string, DrillItemState> }

const EMPTY: DrillItemState = { value: '', tries: 0, verdict: null, hint: 0 }

export interface DrillProps {
  block: DrillBlock
  state: BlockState | undefined
  onChange: (state: DrillState) => void
  onMiss: (item: DrillItem, typed: string) => void
}

function seededShuffle(words: string[], seed: string): string[] {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  const out = [...words]
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function Drill({ block, state, onChange, onMiss }: DrillProps) {
  const t = useT()
  const saved = (state as DrillState | undefined)?.items ?? {}
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const bank = useMemo(() => seededShuffle(block.bank, block.id), [block.bank, block.id])
  const solved = block.items.filter((it) => saved[it.id]?.verdict === 'ok').length

  function commit(item: DrillItem, next: DrillItemState) {
    onChange({ items: { ...saved, [item.id]: next } })
  }

  function check(item: DrillItem, index: number) {
    const current = saved[item.id] ?? EMPTY
    if (current.verdict === 'ok') return
    const value = drafts[item.id] ?? current.value
    const verdict = checkAnswer(value, item.answers)
    if (verdict.kind === 'empty') return
    if (verdict.kind === 'ok') {
      commit(item, { ...current, value: verdict.answer, verdict: 'ok' })
      setDrafts((d) => {
        const next = { ...d }
        delete next[item.id]
        return next
      })
      inputs.current[block.items[index + 1]?.id ?? '']?.focus()
      return
    }
    if (verdict.kind === 'near') {
      commit(item, { ...current, value, verdict: 'near' })
      return
    }
    const tries = current.tries + 1
    const miss = tries >= 2 && current.hint === 0 && !current.carded
    commit(item, { ...current, value, tries, verdict: 'bad', carded: current.carded || miss })
    if (miss) onMiss(item, value.trim())
  }

  function hint(item: DrillItem) {
    const current = saved[item.id] ?? EMPTY
    if (current.verdict === 'ok') return
    const level = Math.min(current.hint + 1, 3) as 1 | 2 | 3
    commit(item, { ...current, value: drafts[item.id] ?? current.value, hint: level, verdict: current.verdict === 'near' ? 'near' : null })
    inputs.current[item.id]?.focus()
  }

  function feedback(item: DrillItem, s: DrillItemState): { text: string; tone: string } | null {
    if (s.verdict === 'ok') return { text: '✓ ' + (item.note ?? ''), tone: 'text-ink-green' }
    if (s.verdict === 'near') return { text: t('course.near', { a: item.answers[0] }), tone: 'text-amber-text' }
    if (s.verdict === 'bad' && s.tries >= 2)
      return { text: '✗ ' + t('course.correctIs', { a: item.answers[0] }) + (item.note ? ' ' + item.note : ''), tone: 'text-pen-red' }
    if (s.verdict === 'bad') return { text: '✗ ' + t('course.retry') + (item.hint ? ' ' + item.hint : ''), tone: 'text-pen-red' }
    if (s.hint === 3) return { text: t('course.hint3', { a: item.answers[0] }), tone: 'text-amber-text' }
    if (s.hint > 0) return { text: t(s.hint === 1 ? 'course.hint1' : 'course.hint2', { h: hintFor(item.answers[0], s.hint as 1 | 2) }), tone: 'text-muted' }
    return null
  }

  return (
    <section className="px-6 pt-5" data-testid={`drill-${block.id}`}>
      <div className="rounded-md border border-border-strong bg-surface p-4 shadow-card md:p-5">
        <div className="flex items-baseline justify-between gap-3 pb-2">
          <span className="text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{block.title}</span>
          <span className="text-[13px] tabular-nums text-muted" data-testid="drill-score">
            {solved === block.items.length ? '✓ ' : ''}
            {t('course.score', { n: solved, total: block.items.length })}
          </span>
        </div>
        {bank.length > 0 && (
          <p className="m-0 mb-3 flex flex-wrap gap-1.5 rounded-sm bg-surface-raised p-2.5" lang="pl">
            {bank.map((w) => (
              <span key={w} className="rounded-full border border-border bg-surface px-2 text-[14px] leading-6">
                {w}
              </span>
            ))}
          </p>
        )}
        <ol className="m-0 list-none p-0">
          {block.items.map((item, index) => {
            const s = saved[item.id] ?? EMPTY
            const fb = feedback(item, s)
            const done = s.verdict === 'ok'
            return (
              <li key={item.id} className={cn('py-3', index > 0 && 'hairline-t')} data-testid={`item-${item.id}`} data-verdict={s.verdict ?? ''}>
                <p className="m-0 pb-2 font-serif text-[17px] leading-6">
                  {item.prompt}
                  {s.hint > 0 && <span className="pl-2 font-sans text-[11px] text-faint">{t('course.withHint')}</span>}
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={(el) => { inputs.current[item.id] = el }}
                    lang="pl"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    spellCheck={false}
                    placeholder={t('course.placeholder')}
                    value={drafts[item.id] ?? s.value}
                    readOnly={done}
                    invalid={s.verdict === 'bad'}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') { e.preventDefault(); check(item, index) }
                    }}
                    onBlur={() => { if ((drafts[item.id] ?? '') !== '' && drafts[item.id] !== s.value) check(item, index) }}
                  />
                  {!done && (
                    <Button variant="secondary" size="sm" className="shrink-0 self-center" onClick={() => hint(item)}>
                      {t('course.hint')}
                    </Button>
                  )}
                </div>
                {fb && <p className={cn('m-0 pt-1.5 text-[13px] leading-5', fb.tone)}>{fb.text}</p>}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
