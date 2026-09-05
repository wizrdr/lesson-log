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
    <ul ref={ref} className={cn('m-0 list-none border-y border-border p-0 divide-y divide-border', className)} {...rest}>
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
    <div ref={ref} className={cn('border-y border-border py-3.5', className)} {...rest}>
      {children}
    </div>
  )
})
