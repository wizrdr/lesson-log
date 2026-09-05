import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from './cn'
import { inputBaseClass } from './Input'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(inputBaseClass, 'h-11 border-border pr-8', className)} {...rest}>
      {children}
    </select>
  )
})

export default Select
