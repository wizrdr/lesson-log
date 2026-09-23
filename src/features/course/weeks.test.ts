import type { CourseListItem } from '@/api/course'
import { currentWeek } from './weeks'

const week = (slug: string, week_start: string): CourseListItem => ({ id: slug, slug, kind: 'week', position: 0, title: slug, subtitle: null, week_start })
const items = [week('w0', '2026-09-21'), week('w1', '2026-09-28')]

it('picks the week that contains today', () => {
  expect(currentWeek(items, new Date('2026-09-23T12:00:00'))?.slug).toBe('w0')
  expect(currentWeek(items, new Date('2026-09-27T23:00:00'))?.slug).toBe('w0')
  expect(currentWeek(items, new Date('2026-09-28T08:00:00'))?.slug).toBe('w1')
})

it('returns null before the first week and after the last one ends', () => {
  expect(currentWeek(items, new Date('2026-09-20T12:00:00'))).toBeNull()
  expect(currentWeek(items, new Date('2026-10-05T12:00:00'))).toBeNull()
})
