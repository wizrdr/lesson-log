import type { CourseListItem } from '@/api/course'

function localISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// A week item is current from its Monday (week_start) through the following Sunday.
export function currentWeek(items: CourseListItem[], now = new Date()): CourseListItem | null {
  const today = localISODate(now)
  const weeks = items.filter((i) => i.kind === 'week' && i.week_start).sort((a, b) => (a.week_start! < b.week_start! ? -1 : 1))
  let found: CourseListItem | null = null
  for (const w of weeks) if (w.week_start! <= today) found = w
  if (!found) return null
  const end = new Date(`${found.week_start}T00:00:00`)
  end.setDate(end.getDate() + 7)
  return today < localISODate(end) ? found : null
}
