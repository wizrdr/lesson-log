import { cn } from './cn'

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'пн',
  2: 'вт',
  3: 'ср',
  4: 'чт',
  5: 'пт',
  6: 'сб',
  7: 'вс',
}

export interface WeekdayPickerProps {
  value: Weekday[]
  onChange: (days: Weekday[]) => void
  className?: string
}

export function WeekdayPicker({ value, onChange, className }: WeekdayPickerProps) {
  const toggle = (d: Weekday) => {
    const next = value.includes(d) ? value.filter((x) => x !== d) : [...value, d]
    onChange(WEEKDAYS.filter((w) => next.includes(w)))
  }
  return (
    <div role="group" aria-label="Дни недели" className={cn('flex justify-between gap-1', className)}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(d)}
            className={cn(
              'size-11 rounded-full text-sm font-medium select-none',
              'transition-colors duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              on ? 'bg-ink text-ink-fg' : 'border border-border-strong text-muted hover:text-text',
            )}
          >
            {WEEKDAY_LABELS[d]}
          </button>
        )
      })}
    </div>
  )
}

export default WeekdayPicker
