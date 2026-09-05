import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  full?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110 active:brightness-95',
  ghost: 'bg-transparent text-text hover:bg-surface-raised active:bg-surface-raised',
  danger: 'bg-danger-soft text-danger hover:brightness-95 active:brightness-90',
  soft: 'bg-accent-soft text-accent hover:brightness-95 active:brightness-90',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-base gap-2',
  lg: 'min-h-13 px-5 text-lg gap-2',
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
        'relative inline-flex items-center justify-center rounded-md font-medium select-none',
        'transition-[background-color,filter,opacity,transform] duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-50 disabled:pointer-events-none',
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
