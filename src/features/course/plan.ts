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
  today: NextStep[]
  overdue: number
}

export type AllProgress = Record<string, ProgressMap>

export function isMarkedDone(progress: ProgressMap | undefined): boolean {
  return progress?.[DONE_MARKER]?.done === true
}

function checklistState(progress: ProgressMap | undefined, blockId: string): Record<string, unknown> {
  const done = progress?.[blockId]?.done
  return typeof done === 'object' && done !== null ? (done as Record<string, unknown>) : {}
}

const DATE_RE = /(?<![\d.])(\d{2})\.(\d{2})(?![\d.])/

// Items and headings carry dd.mm only; the year comes from week_start, rolling over near New Year.
export function dateIn(text: string, weekStart: string): string | null {
  const m = DATE_RE.exec(text.replace(/\]\([^)]*\)/g, ']'))
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  const [wsYear, wsMonth] = weekStart.split('-').map(Number)
  const year = month - wsMonth > 6 ? wsYear - 1 : wsMonth - month > 6 ? wsYear + 1 : wsYear
  return `${year}-${m[2]}-${m[1]}`
}

const TIME = /(?<!\d)([01]\d|2[0-3]):[0-5]\d(?!\d)/

// Steps without a time keep their place in the document; timed ones are ordered by the clock.
function byTime(steps: NextStep[]): NextStep[] {
  const at = (s: NextStep) => (s.heading ?? '').match(TIME)?.[0] ?? null
  return steps
    .map((s, i) => ({ s, i, t: at(s) }))
    .sort((a, b) => (a.t && b.t && a.t !== b.t ? (a.t < b.t ? -1 : 1) : a.i - b.i))
    .map((x) => x.s)
}

function walk(body: Block[], progress: ProgressMap | undefined, weekStart: string, todayISO: string) {
  let checked = 0
  let total = 0
  let overdue = 0
  const today: NextStep[] = []
  let upcoming: NextStep | null = null
  let undated: NextStep | null = null
  let past: NextStep | null = null
  let heading: string | null = null
  let headingDate: string | null = null
  for (const block of body) {
    if (block.type === 'heading') {
      heading = block.text
      headingDate = dateIn(block.text, weekStart)
    }
    if (block.type !== 'checklist') continue
    const state = checklistState(progress, block.id)
    for (const item of block.items) {
      total++
      if (state[item.id] === true) {
        checked++
        continue
      }
      const step = { heading: block.title ?? heading, md: item.md }
      const date = dateIn(item.md, weekStart) ?? headingDate
      if (date === null) undated ??= step
      else if (date < todayISO) {
        overdue++
        past ??= step
      } else {
        if (date === todayISO) today.push(step)
        upcoming ??= step
      }
    }
  }
  return { checked, total, overdue, today: byTime(today), next: upcoming ?? undated ?? past }
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
    const { checked, total, next, today: todaySteps, overdue } = walk(bodies[item.id] ?? [], p, item.week_start!, today)
    const finished = isMarkedDone(p) || (total > 0 && checked === total)
    const past = currentStart ? item.week_start! < currentStart : item.week_start! < today
    const status: WeekStatus = finished ? 'done' : item.id === current?.id ? 'current' : past ? 'missed' : 'upcoming'
    return finished
      ? { item, status, checked, total, next: null, today: [], overdue: 0 }
      : { item, status, checked, total, next, today: todaySteps, overdue }
  })

  const focus =
    plan.find((w) => w.item.id === current?.id) ??
    [...plan].reverse().find((w) => w.status === 'missed') ??
    plan.find((w) => w.status === 'upcoming') ??
    null
  const after = focus ? plan.slice(plan.indexOf(focus) + 1).find((w) => w.status !== 'done') ?? null : null
  return { weeks: plan, focus, after }
}
