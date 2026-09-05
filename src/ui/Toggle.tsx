import { useId } from 'react'
import { cn } from './cn'

export interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, id, disabled, className }: ToggleProps) {
  const autoId = useId()
  const switchId = id ?? autoId
  const labelId = `${switchId}-label`
  return (
    <div className={cn('flex items-center justify-between gap-3 min-h-11', className)}>
      {label && (
        <label id={labelId} htmlFor={switchId} className="text-text select-none">
          {label}
        </label>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 h-8 w-13 rounded-full p-0.5 transition-colors duration-normal ease-out',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-border-strong',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'block size-7 rounded-full bg-surface shadow-card transition-transform duration-normal ease-out',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}

export default Toggle
