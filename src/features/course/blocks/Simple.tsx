import type { CalloutBlock, DialogBlock, HeadingBlock, TableBlock, TextBlock } from '../../../../supabase/functions/_shared/course-input.ts'
import { cn } from '@/ui'
import { RichFlow, RichInline, SayButton } from '../Rich'

export function Heading({ block }: { block: HeadingBlock }) {
  return block.level === 2 ? (
    <h2 className="px-6 pt-8 font-serif text-[22px] leading-8 font-semibold italic tracking-[-0.01em]">{block.text}</h2>
  ) : (
    <h3 className="px-6 pt-5 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{block.text}</h3>
  )
}

export function Text({ block }: { block: TextBlock }) {
  return <RichFlow md={block.md} className="px-6 pt-3 font-serif text-[17px] leading-6" />
}

const TONE = {
  note: 'border-border bg-surface',
  warn: 'border-amber bg-surface',
  task: 'border-border-strong border-l-4 border-l-ink bg-surface',
} as const

export function Callout({ block }: { block: CalloutBlock }) {
  return (
    <div className="px-6 pt-4">
      <aside className={cn('rounded-md border px-4 py-3', TONE[block.tone])} data-tone={block.tone}>
        {block.title && (
          <p className={cn('m-0 pb-1 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em]', block.tone === 'warn' ? 'text-amber-text' : 'text-faint')}>
            {block.title}
          </p>
        )}
        <RichFlow md={block.md} className="font-serif text-[16px] leading-6" />
      </aside>
    </div>
  )
}

export function Table({ block }: { block: TableBlock }) {
  return (
    <div className="overflow-x-auto px-6 pt-4">
      <table className="w-full border-collapse text-left text-[15px] leading-6">
        <thead>
          <tr className="hairline-b">
            {block.head.map((h, i) => (
              <th key={i} className="px-2 py-1.5 align-bottom text-[11px] font-semibold uppercase tracking-[0.08em] text-faint first:pl-0">
                {h === '·' ? '' : <RichInline md={h} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="hairline-b">
              {row.map((cell, c) => (
                <td key={c} className="px-2 py-1.5 align-top first:pl-0">
                  <RichInline md={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Dialog({ block }: { block: DialogBlock }) {
  return (
    <ul className="m-0 list-none px-6 pt-4">
      {block.turns.map((turn, i) => (
        <li key={i} className="hairline-b grid grid-cols-[4.5rem_1fr] gap-3 py-2">
          <span className="pt-0.5 text-[11px] leading-6 font-semibold uppercase tracking-[0.08em] text-faint">{turn.who}</span>
          <p className="m-0 font-serif text-[17px] leading-6">
            <span lang="pl" className="font-semibold">{turn.pl}</span> <SayButton text={turn.pl} />
            {turn.gloss && <span className="block text-[15px] italic text-muted">{turn.gloss}</span>}
          </p>
        </li>
      ))}
    </ul>
  )
}
