import { forwardRef, useImperativeHandle, useRef, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'
import { inputBaseClass } from './Input'
import { useAutoGrow } from './useAutoGrow'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoGrow?: boolean
  maxRows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows, autoGrow = false, maxRows = 4, value, ...rest },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => inner.current!, [])
  const minRows = rows ?? (autoGrow ? 1 : 3)
  useAutoGrow(inner, autoGrow ? String(value ?? '') : '', minRows, autoGrow ? maxRows : minRows)
  return (
    <textarea
      ref={inner}
      rows={minRows}
      value={value}
      className={cn(inputBaseClass, 'border-border-strong py-2.5 leading-6', autoGrow ? 'resize-none' : 'resize-y', className)}
      {...rest}
    />
  )
})

export default Textarea
