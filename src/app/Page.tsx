import type { ReactNode } from 'react'

export interface PageProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Page({ title, subtitle, action, children }: PageProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}
