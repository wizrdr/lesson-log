import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, className, padded = true, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('bg-surface rounded-lg shadow-card border border-border', padded && 'p-4', className)}
      {...rest}
    >
      {children}
    </div>
  )
})

export default Card
