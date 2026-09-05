import type { LessonStatus } from '@/api/types'
import { cn } from '@/ui'
import { STATUS_TEXT } from './format'

export interface StatusLineProps {
  status: Exclude<LessonStatus, 'ready'>
  error?: string | null
  className?: string
}

export function StatusLine({ status, error, className }: StatusLineProps) {
  const failed = status === 'failed'
  return (
    <span className={cn('flex items-center gap-2 text-[13px]', failed ? 'text-pen-red' : 'text-amber-text', className)}>
      <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', failed ? 'bg-pen-red' : 'bg-amber')} />
      <span className="min-w-0 truncate">{failed && error ? `${STATUS_TEXT.failed}: ${error}` : STATUS_TEXT[status]}</span>
    </span>
  )
}
