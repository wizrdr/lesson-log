import { format, isSameYear, parseISO } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { EntryCounts } from '@/api/lessons'
import type { Lang, Translate } from '@/i18n'

const DATE = {
  ru: { locale: ru, thisYear: 'd MMMM', other: 'd MMMM yyyy' },
  en: { locale: enUS, thisYear: 'MMMM d', other: 'MMMM d, yyyy' },
} satisfies Record<Lang, unknown>

export function formatLessonDate(iso: string, lang: Lang): string {
  const d = parseISO(iso)
  const { locale, thisYear, other } = DATE[lang]
  return format(d, isSameYear(d, new Date()) ? thisYear : other, { locale })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatBytes(bytes: number, t: Translate): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} ${t('unit.mb')}` : `${Math.max(1, Math.round(bytes / 1024))} ${t('unit.kb')}`
}

export function formatEntryBreakdown(total: number, counts: EntryCounts, t: Translate): string {
  const parts = [
    counts.correction > 0 && t.plural('corrections', counts.correction),
    counts.vocab > 0 && t.plural('vocab', counts.vocab),
    counts.rule > 0 && t.plural('rules', counts.rule),
  ].filter((p): p is string => typeof p === 'string')
  const entries = t.plural('entries', total)
  return parts.length ? `${entries} · ${parts.join(', ')}` : entries
}
