import type { Block, CourseListItem, ProgressMap } from '@/api/course'
import { currentWeek, localISODate } from './weeks'

// Progress row that marks a lesson or week as finished by the learner.
export const DONE_MARKER = '_done'

export type WeekStatus = 'done' | 'current' | 'missed' | 'upcoming'

export interface NextStep {
  heading: string | null
  md: string
}

export interface WeekPlan {
  item: CourseListItem
  status: WeekStatus
  checked: number
  total: number
  next: NextStep | null
}

export type AllProgress = Record<string, ProgressMap>

export function isMarkedDone(progress: ProgressMap | undefined): boolean {
  return progress?.[DONE_MARKER]?.done === true
}

function checklistState(progress: ProgressMap | undefined, blockId: string): Record<string, unknown> {
  const done = progress?.[blockId]?.done
  return typeof done === 'object' && done !== null ? (done as Record<string, unknown>) : {}
}

function walk(body: Block[], progress: ProgressMap | undefined) {
  let checked = 0
  let total = 0
  let next: NextStep | null = null
  let heading: string | null = null
  for (const block of body) {
    if (block.type === 'heading') heading = block.text
    if (block.type !== 'checklist') continue
    const state = checklistState(progress, block.id)
    for (const item of block.items) {
      total++
      if (state[item.id] === true) checked++
      else if (!next) next = { heading: block.title ?? heading, md: item.md }
    }
  }
  return { checked, total, next }
}

export function buildPlan(items: CourseListItem[], bodies: Record<string, Block[]>, progress: AllProgress, now = new Date()) {
  const current = currentWeek(items, now)
  const weeks = items
    .filter((i) => i.kind === 'week' && i.week_start)
    .sort((a, b) => (a.week_start! < b.week_start! ? -1 : 1))
  const currentStart = current?.week_start ?? null
  const today = localISODate(now)

  const plan: WeekPlan[] = weeks.map((item) => {
    const p = progress[item.id]
    const { checked, total, next } = walk(bodies[item.id] ?? [], p)
    const finished = isMarkedDone(p) || (total > 0 && checked === total)
    const past = currentStart ? item.week_start! < currentStart : item.week_start! < today
    const status: WeekStatus = finished ? 'done' : item.id === current?.id ? 'current' : past ? 'missed' : 'upcoming'
    return { item, status, checked, total, next: finished ? null : next }
  })

  const focus =
    plan.find((w) => w.item.id === current?.id) ??
    [...plan].reverse().find((w) => w.status === 'missed') ??
    plan.find((w) => w.status === 'upcoming') ??
    null
  const after = focus ? plan.slice(plan.indexOf(focus) + 1).find((w) => w.status !== 'done') ?? null : null
  return { weeks: plan, focus, after }
}
