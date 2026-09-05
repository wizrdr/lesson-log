import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'
import { inputBaseClass } from './Input'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(inputBaseClass, 'border-border py-2.5 min-h-[5.5rem] resize-y', className)}
      {...rest}
    />
  )
})

export default Textarea
