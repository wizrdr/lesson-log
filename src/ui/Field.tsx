import { useId, type ReactNode } from 'react'
import { cn } from './cn'

export interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, children, className }: FieldProps) {
  const hintId = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && (
        <span id={hintId} className="text-[13px] text-muted">
          {hint}
        </span>
      )}
    </div>
  )
}

export default Field
