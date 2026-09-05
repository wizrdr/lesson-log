import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, cn } from '@/ui'

export interface PageProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  back?: { to: string; label: string }
  children: ReactNode
}

export function Page({ title, subtitle, action, back, children }: PageProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col pb-10">
      <header className="flex flex-col gap-1.5 px-6 pt-5">
        {back && (
          <Link
            to={back.to}
            className="-ml-2 flex h-11 items-center gap-1.5 self-start text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-ink"
          >
            <ChevronLeftIcon />
            <span>{back.label}</span>
          </Link>
        )}
        <div className="flex items-end justify-between gap-3">
          <h1
            className={cn(
              'font-serif font-semibold tracking-[-0.01em]',
              back ? 'text-[30px] leading-[1.1]' : 'text-[34px] leading-[1.05]',
            )}
          >
            {title}
          </h1>
          {action}
        </div>
        {subtitle && <p className="font-serif text-base italic text-muted">{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}
