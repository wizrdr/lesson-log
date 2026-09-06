import { createElement, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export interface IndexCardProps extends HTMLAttributes<HTMLElement> {
  interactive?: boolean
  as?: 'div' | 'section' | 'article'
  children: ReactNode
}

export function IndexCard({ interactive = false, as = 'div', className, children, ...rest }: IndexCardProps) {
  const classes = cn(
    'block w-full rounded-md border border-border-strong bg-surface p-5 text-left text-text shadow-card md:p-6',
    interactive &&
      'cursor-pointer select-none transition-[border-color,translate] duration-fast ease-out hover:border-ink hover:-translate-y-px active:translate-y-0 focus-ring',
    className,
  )
  if (interactive) return createElement('button', { type: 'button', className: classes, ...rest }, children)
  return createElement(as, { className: classes, ...rest }, children)
}

export default IndexCard
