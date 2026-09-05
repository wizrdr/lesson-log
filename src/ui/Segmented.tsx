import { cn } from './cn'

export interface SegmentedOption {
  value: string
  label: string
}

export interface SegmentedProps {
  options: SegmentedOption[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function Segmented({ options, value, onChange, className }: SegmentedProps) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-full border-[1.5px] border-ink p-0.5 gap-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-9 px-4 rounded-full text-sm font-semibold select-none whitespace-nowrap',
              'transition-[background-color,color] duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              active ? 'bg-ink text-ink-fg' : 'text-muted hover:text-text',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default Segmented
