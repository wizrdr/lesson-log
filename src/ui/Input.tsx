import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const inputBaseClass = cn(
  'w-full min-w-0 bg-surface-raised text-text placeholder:text-faint rounded-md border px-3',
  'transition-[border-color,box-shadow] duration-fast ease-out outline-none appearance-none',
  'focus:border-accent focus:ring-2 focus:ring-accent/30',
  'disabled:opacity-50',
)

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBaseClass, 'h-11', invalid ? 'border-danger' : 'border-border', className)}
      {...rest}
    />
  )
})

export default Input
