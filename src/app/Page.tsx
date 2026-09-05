import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, cn } from '@/ui'

export interface PageProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  back?: { to: string; label: string }
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export function Page({ title, subtitle, action, back, footer, className, children }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-lg flex-1 flex-col md:ml-8 md:mr-0 md:max-w-[640px]',
        footer ? null : 'pb-12',
        className,
      )}
    >
      <header className="flex flex-col px-6 pt-6 pb-1">
        {back && (
          <Link
            to={back.to}
            className="-ml-2 flex h-12 items-center gap-1.5 self-start px-2 text-sm font-medium text-muted focus-ring"
          >
            <ChevronLeftIcon />
            <span>{back.label}</span>
          </Link>
        )}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <h1 className={cn('font-serif font-semibold leading-10 tracking-[-0.01em]', back ? 'text-[30px]' : 'text-[34px]')}>
            {title}
          </h1>
          {action}
        </div>
        {subtitle && <p className="font-serif text-base leading-6 italic text-muted">{subtitle}</p>}
      </header>
      {children}
      {footer && (
        <div className="paper hairline-t sticky bottom-0 mt-auto px-6 pt-3 pb-2">
          <div className="mx-auto md:max-w-[420px]">{footer}</div>
        </div>
      )}
    </div>
  )
}
