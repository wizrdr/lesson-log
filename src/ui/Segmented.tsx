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
    <div role="tablist" className={cn('inline-flex p-1 rounded-md bg-surface-raised gap-1', className)}>
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
              'min-h-9 px-3 rounded-sm text-sm font-medium select-none whitespace-nowrap',
              'transition-[background-color,color,box-shadow] duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              active ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text',
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
