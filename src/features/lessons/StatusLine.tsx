import type { LessonStatus } from '@/api/types'
import { useT } from '@/i18n'
import { cn } from '@/ui'

export interface StatusLineProps {
  status: Exclude<LessonStatus, 'ready'>
  error?: string | null
  className?: string
}

export function StatusLine({ status, error, className }: StatusLineProps) {
  const t = useT()
  const failed = status === 'failed'
  const text = t(`status.${status}`)
  return (
    <span className={cn('flex items-start gap-2 text-[13px] leading-5', failed ? 'text-pen-red' : 'text-amber-text', className)}>
      <span aria-hidden className={cn('mt-1.5 inline-block size-2 shrink-0 rounded-full', failed ? 'bg-pen-red' : 'bg-amber')} />
      <span className="min-w-0">{failed && error ? `${text}: ${error}` : text}</span>
    </span>
  )
}
