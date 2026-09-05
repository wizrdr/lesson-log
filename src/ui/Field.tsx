import { type ReactNode } from 'react'
import { cn } from './cn'

export interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] leading-5 font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[13px] leading-5 text-muted">{hint}</span>}
    </div>
  )
}

export default Field
