import { format, isSameYear, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { LessonStatus, TutorLanguage } from '@/api/types'
import type { EntryCounts } from '@/api/lessons'

export const LANGUAGE_LABELS: Record<TutorLanguage, string> = { pl: 'польский', en: 'английский' }

export const STATUS_TEXT: Record<Exclude<LessonStatus, 'ready'>, string> = {
  uploaded: 'Загружено, ждёт расшифровки',
  transcribing: 'Разбор записи, обычно 2–5 минут',
  extracting: 'Разбор записи, обычно 2–5 минут',
  failed: 'Ошибка расшифровки',
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

export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`
  return `${n} ${many}`
}

export const pluralEntries = (n: number) => plural(n, ['запись', 'записи', 'записей'])
export const pluralCards = (n: number) => plural(n, ['карточка', 'карточки', 'карточек'])

export function formatEntryBreakdown(total: number, counts: EntryCounts): string {
  const parts = [
    counts.correction > 0 && plural(counts.correction, ['исправление', 'исправления', 'исправлений']),
    counts.vocab > 0 && plural(counts.vocab, ['слово', 'слова', 'слов']),
    counts.rule > 0 && plural(counts.rule, ['правило', 'правила', 'правил']),
  ].filter((p): p is string => typeof p === 'string')
  return parts.length ? `${pluralEntries(total)} · ${parts.join(', ')}` : pluralEntries(total)
}
