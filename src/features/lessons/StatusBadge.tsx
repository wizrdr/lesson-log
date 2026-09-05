import type { LessonStatus } from '@/api/types'
import { cn } from '@/ui'
import { STATUS_LABELS } from './format'

const STATUS_CLASS: Record<LessonStatus, string> = {
  uploaded: 'bg-surface-raised text-muted',
  transcribing: 'bg-accent-soft text-accent',
  extracting: 'bg-accent-soft text-accent',
  ready: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
}

export function StatusBadge({ status, suffix, className }: { status: LessonStatus; suffix?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
      {suffix ? ` · ${suffix}` : null}
    </span>
  )
}
