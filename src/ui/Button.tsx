import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  full?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-ink-fg hover:opacity-90 active:opacity-80',
  secondary: 'border-[1.5px] border-ink bg-transparent text-text hover:bg-surface-raised active:bg-surface-raised',
  ghost: 'bg-transparent text-muted hover:text-text active:bg-surface-raised',
  danger: 'border-[1.5px] border-pen-red bg-transparent text-pen-red hover:bg-surface-raised active:bg-surface-raised',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-sm gap-2',
  md: 'min-h-12 px-5 text-[15px] gap-2.5',
  lg: 'min-h-13 px-6 text-[15px] gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, full = false, className, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold select-none',
        'transition-[background-color,color,opacity] duration-fast ease-out',
        'focus-ring',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantClass[variant],
        sizeClass[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="absolute size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>{children}</span>
    </button>
  )
})

export default Button
