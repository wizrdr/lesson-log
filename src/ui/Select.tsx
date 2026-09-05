import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from './cn'
import { ChevronDownIcon } from './icons'
import { inputBaseClass } from './Input'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} className={cn(inputBaseClass, 'h-11 border-border-strong pr-10')} {...rest}>
        {children}
      </select>
      <ChevronDownIcon size={20} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
    </div>
  )
})

export default Select
