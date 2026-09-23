import type { ChecklistBlock, QuizBlock, RecallBlock } from '../../../../supabase/functions/_shared/course-input.ts'
import { useT } from '@/i18n'
import { Button, CheckIcon, cn } from '@/ui'
import type { BlockState } from '@/api/course'
import { RichFlow, RichInline } from '../Rich'

export type QuizState = { picked?: string[] }
export type RecallState = { open?: boolean }
export type ChecklistState = { done?: Record<string, boolean> }

interface Props<B, S> {
  block: B
  state: BlockState | undefined
  onChange: (state: S) => void
}

export function Quiz({ block, state, onChange }: Props<QuizBlock, QuizState>) {
  const t = useT()
  const picked = (state as QuizState | undefined)?.picked ?? []
  const solved = picked.includes(block.answer)
  const last = picked[picked.length - 1]
  return (
    <section className="px-6 pt-5" data-testid={`quiz-${block.id}`}>
      <div className="rounded-md border border-border-strong bg-surface p-4 md:p-5">
        <p className="m-0 pb-3 font-serif text-[17px] leading-6 font-semibold">
          <RichInline md={block.question} />
        </p>
        <div className="grid gap-2">
          {block.options.map((o) => {
            const chosen = picked.includes(o.key)
            const right = o.key === block.answer
            return (
              <button
                key={o.key}
                type="button"
                lang="pl"
                disabled={solved || chosen}
                aria-pressed={chosen}
                onClick={() => onChange({ picked: [...picked, o.key] })}
                className={cn(
                  'min-h-11 rounded-md border px-3 py-2 text-left font-serif text-[16px] leading-6 transition-colors duration-fast focus-ring',
                  chosen && right && 'border-ink-green text-ink-green',
                  chosen && !right && 'border-pen-red text-pen-red line-through',
                  !chosen && 'border-border-strong hover:border-ink',
                  solved && !chosen && 'opacity-60',
                )}
              >
                {o.text}
              </button>
            )
          })}
        </div>
        {last !== undefined && (
          <p className={cn('m-0 pt-3 text-[13px] leading-5', solved ? 'text-ink-green' : 'text-pen-red')}>
            {solved ? '✓ ' + (picked.length > 1 ? t('course.secondTry') + ' ' : '') + block.ok : '✗ ' + block.bad}
          </p>
        )}
      </div>
    </section>
  )
}

export function Recall({ block, state, onChange }: Props<RecallBlock, RecallState>) {
  const t = useT()
  const open = (state as RecallState | undefined)?.open === true
  return (
    <section className="px-6 pt-5" data-testid={`recall-${block.id}`}>
      <div className="rounded-md border border-dashed border-border-strong bg-surface p-4 md:p-5">
        <p className="m-0 pb-3 font-serif text-[17px] leading-6 font-semibold">
          <RichInline md={block.question} />
        </p>
        {open ? (
          <RichFlow md={block.answer} className="hairline-t pt-3 font-serif text-[16px] leading-6" />
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onChange({ open: true })}>
            {t('course.showAnswer')}
          </Button>
        )}
      </div>
    </section>
  )
}

export function Checklist({ block, state, onChange }: Props<ChecklistBlock, ChecklistState>) {
  const done = (state as ChecklistState | undefined)?.done ?? {}
  return (
    <section className="px-6 pt-4" data-testid={`checklist-${block.id}`}>
      {block.title && <p className="m-0 pb-1 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{block.title}</p>}
      <ul className="m-0 list-none p-0">
        {block.items.map((item) => {
          const checked = done[item.id] === true
          return (
            <li key={item.id}>
              <label className="relative flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={() => onChange({ done: { ...done, [item.id]: !checked } })}
                />
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
                    checked ? 'border-ink bg-ink text-ink-fg' : 'border-border-strong bg-surface',
                  )}
                >
                  {checked && <CheckIcon size={14} />}
                </span>
                <span className={cn('font-serif text-[16px] leading-6', checked && 'text-faint line-through')}>
                  <RichInline md={item.md} />
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
