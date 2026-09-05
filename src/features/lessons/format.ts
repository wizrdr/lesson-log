import { format, isSameYear, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { LessonStatus, TutorLanguage } from '@/api/types'

export const LANGUAGE_LABELS: Record<TutorLanguage, string> = { pl: 'польский', en: 'английский' }

export const STATUS_LABELS: Record<LessonStatus, string> = {
  uploaded: 'загружено',
  transcribing: 'расшифровка',
  extracting: 'разбор',
  ready: 'готово',
  failed: 'ошибка',
}

export function formatLessonDate(iso: string): string {
  const d = parseISO(iso)
  return format(d, isSameYear(d, new Date()) ? 'd MMMM' : 'd MMMM yyyy', { locale: ru })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

export function pluralEntries(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} запись`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} записи`
  return `${n} записей`
}
