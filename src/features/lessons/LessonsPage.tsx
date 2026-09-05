import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countDueCards } from '@/api/cards'
import { listRecurringCorrections, type RecurringCorrection } from '@/api/entries'
import { listLessons, subscribeLessons, type LessonListItem } from '@/api/lessons'
import { listTutors } from '@/api/tutors'
import type { Tutor } from '@/api/types'
import { Page } from '@/app/Page'
import { useErrorText, useLocale, useT } from '@/i18n'
import { Button, ChevronRightIcon, GlobeIcon, HairlineList, IconButton, UploadIcon } from '@/ui'
import { formatEntryBreakdown, formatLessonDate } from './format'
import { StatusLine } from './StatusLine'
import { UploadSheet } from './UploadSheet'

export function LessonsPage() {
  const t = useT()
  const { lang, setLang } = useLocale()
  const errorText = useErrorText()
  const [lessons, setLessons] = useState<LessonListItem[] | null>(null)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [dueCards, setDueCards] = useState(0)
  const [recurring, setRecurring] = useState<RecurringCorrection | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const reload = useCallback(() => {
    listLessons()
      .then((rows) => {
        setLessons(rows)
        setError(null)
      })
      .catch(setError)
    countDueCards().then(setDueCards).catch(setError)
    listRecurringCorrections()
      .then((list) => setRecurring(list[0] ?? null))
      .catch(setError)
  }, [])

  useEffect(() => {
    reload()
    listTutors().then(setTutors).catch(setError)
    return subscribeLessons(reload)
  }, [reload])

  const summary = dueCards > 0 || recurring !== null

  return (
    <Page
      title={t('lessons.title')}
      action={
        <div className="flex items-center gap-1">
          <IconButton label={t('lang.other')} onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>
            <GlobeIcon />
          </IconButton>
          <Button variant="secondary" size="sm" aria-label={t('upload.title')} onClick={() => setSheetOpen(true)}>
            <UploadIcon size={18} />
            {t('lessons.upload')}
          </Button>
        </div>
      }
    >
      {summary && (
        <p className="px-6 pt-3.5 font-serif text-base italic text-muted" data-testid="summary">
          {dueCards > 0 && t('lessons.dueToday', { cards: t.plural('cards', dueCards) })}
          {dueCards > 0 && recurring && ' '}
          {recurring && (
            <>
              {t('lessons.recurring')} <s className="text-pen-red decoration-[1.5px]">{recurring.original}</s>{' '}
              <strong className="font-semibold text-ink-green">{recurring.corrected}</strong>.
            </>
          )}
        </p>
      )}

      {error !== null && <p className="px-6 pt-4 text-[13px] text-pen-red">{errorText(error)}</p>}

      {lessons === null && error === null && <div className="h-24" aria-busy />}

      {lessons?.length === 0 && (
        <p className="px-6 pt-7 font-serif text-base italic text-muted">
          {t('lessons.empty')}{' '}
          <button type="button" className="underline decoration-border-strong underline-offset-4 text-text" onClick={() => setSheetOpen(true)}>
            {t('lessons.uploadFirst')}
          </button>
        </p>
      )}

      {lessons && lessons.length > 0 && (
        <HairlineList className="mt-7">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                to={`/lessons/${lesson.id}`}
                className="grid grid-cols-[92px_minmax(0,1fr)_24px] items-start gap-3 px-6 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
              >
                <span className="font-serif text-[15px] italic leading-[1.3] text-muted">{formatLessonDate(lesson.date, lang)}</span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-serif text-lg font-semibold leading-[1.25]">
                    {lesson.tutor ? `${lesson.tutor.name} · ${t(`language.${lesson.tutor.language}`)}` : t('lessons.tutorDeleted')}
                  </span>
                  {lesson.status === 'ready' ? (
                    <span className="text-[13px] text-muted">{formatEntryBreakdown(lesson.entryCount, lesson.counts, t)}</span>
                  ) : (
                    <StatusLine status={lesson.status} error={lesson.error} />
                  )}
                </span>
                <ChevronRightIcon size={24} className="mt-0.5 text-faint" />
              </Link>
            </li>
          ))}
        </HairlineList>
      )}

      <UploadSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tutors={tutors}
        onTutorCreated={(t) => setTutors((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))}
      />
    </Page>
  )
}
