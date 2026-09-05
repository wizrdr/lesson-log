import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export interface HairlineListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode
}

export const HairlineList = forwardRef<HTMLUListElement, HairlineListProps>(function HairlineList(
  { children, className, ...rest },
  ref,
) {
  return (
    <ul ref={ref} className={cn('m-0 list-none p-0 hairline-t [&>li]:hairline-b', className)} {...rest}>
      {children}
    </ul>
  )
})

export interface HairlineBlockProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const HairlineBlock = forwardRef<HTMLDivElement, HairlineBlockProps>(function HairlineBlock(
  { children, className, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn('hairline-t hairline-b py-3', className)} {...rest}>
      {children}
    </div>
  )
})
