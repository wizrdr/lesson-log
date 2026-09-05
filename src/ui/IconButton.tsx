import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-text select-none',
        'transition-colors duration-fast ease-out hover:bg-surface-raised active:bg-surface-raised',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'size-9 [&>svg]:size-4' : 'size-11 [&>svg]:size-5',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export default IconButton
