import { useMemo } from 'react'
import type { ChoiceBlock, ChoiceItem } from '../../../../supabase/functions/_shared/course-input.ts'
import type { BlockState } from '@/api/course'
import { useT } from '@/i18n'
import { cn } from '@/ui'
import { fillGap, hasGap } from '../missCard'
import { RichInline } from '../Rich'
import { seededShuffle } from '../shuffle'

export interface ChoiceItemState {
  picked: string[]
  carded?: boolean
}

export type ChoiceState = { items?: Record<string, ChoiceItemState> }

export interface ChoiceProps {
  block: ChoiceBlock
  state: BlockState | undefined
  onChange: (state: ChoiceState) => void
  onMiss: (item: ChoiceItem) => void
}

export function Choice({ block, state, onChange, onMiss }: ChoiceProps) {
  const t = useT()
  const saved = (state as ChoiceState | undefined)?.items ?? {}
  const shuffled = useMemo(
    () => Object.fromEntries(block.items.map((it) => [it.id, seededShuffle(it.options, `${block.id}:${it.id}`)])),
    [block.id, block.items],
  )
  const solved = block.items.filter((it) => saved[it.id]?.picked.includes(it.answer)).length

  function pick(item: ChoiceItem, option: string) {
    const current = saved[item.id] ?? { picked: [] }
    if (current.picked.includes(item.answer) || current.picked.includes(option)) return
    const wrongFirst = current.picked.length === 0 && option !== item.answer
    onChange({ items: { ...saved, [item.id]: { picked: [...current.picked, option], carded: current.carded || wrongFirst } } })
    if (wrongFirst && !current.carded) onMiss(item)
  }

  return (
    <section className="px-6 pt-5" data-testid={`choice-${block.id}`}>
      <div className="rounded-md border border-border-strong bg-surface p-4 shadow-card md:p-5">
        <div className="flex items-baseline justify-between gap-3 pb-2">
          <span className="text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{block.title}</span>
          <span className="text-[13px] tabular-nums text-muted" data-testid="choice-score">
            {t('course.score', { n: solved, total: block.items.length })}
          </span>
        </div>
        <ol className="m-0 list-none p-0">
          {block.items.map((item, index) => {
            const picked = saved[item.id]?.picked ?? []
            const done = picked.includes(item.answer)
            const last = picked[picked.length - 1]
            const prompt = done && hasGap(item.prompt) ? fillGap(item.prompt, `**${item.answer}**`) : item.prompt
            return (
              <li key={item.id} className={cn('py-3', index > 0 && 'hairline-t')} data-testid={`choice-item-${item.id}`} data-done={done}>
                <p className="m-0 pb-2 font-serif text-[17px] leading-6" lang="pl">
                  <RichInline md={prompt} />
                </p>
                <div className="flex flex-wrap gap-2">
                  {shuffled[item.id].map((o) => {
                    const chosen = picked.includes(o)
                    const right = o === item.answer
                    return (
                      <button
                        key={o}
                        type="button"
                        lang="pl"
                        disabled={done || chosen}
                        aria-pressed={chosen}
                        onClick={() => pick(item, o)}
                        className={cn(
                          'min-h-11 rounded-md border px-3 py-1.5 text-left font-serif text-[16px] leading-6 transition-colors duration-fast focus-ring',
                          chosen && right && 'border-ink-green text-ink-green',
                          chosen && !right && 'border-pen-red text-pen-red line-through',
                          !chosen && 'border-border-strong hover:border-ink',
                          done && !chosen && 'opacity-50',
                        )}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
                {last !== undefined && (
                  <p className={cn('m-0 pt-1.5 text-[13px] leading-5', done ? 'text-ink-green' : 'text-pen-red')}>
                    <RichInline
                      md={
                        done
                          ? '✓ ' + (picked.length > 1 ? t('course.secondTry') + ' ' : '') + (item.note ?? '')
                          : '✗ ' + t('course.retry') + (item.note ? ' ' + item.note : '')
                      }
                    />
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
