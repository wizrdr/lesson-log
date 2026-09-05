import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countDueCards } from '@/api/cards'
import { listRecurringCorrections, type RecurringCorrection } from '@/api/entries'
import { listLessons, subscribeLessons, type LessonListItem } from '@/api/lessons'
import { listTutors } from '@/api/tutors'
import type { Tutor } from '@/api/types'
import { Page } from '@/app/Page'
import { Button, ChevronRightIcon, HairlineList, UploadIcon } from '@/ui'
import { LANGUAGE_LABELS, formatEntryBreakdown, formatLessonDate, pluralCards } from './format'
import { StatusLine } from './StatusLine'
import { UploadSheet } from './UploadSheet'

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function LessonsPage() {
  const [lessons, setLessons] = useState<LessonListItem[] | null>(null)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [dueCards, setDueCards] = useState(0)
  const [recurring, setRecurring] = useState<RecurringCorrection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const reload = useCallback(() => {
    listLessons()
      .then((rows) => {
        setLessons(rows)
        setError(null)
      })
      .catch((e: unknown) => setError(errorText(e)))
    countDueCards()
      .then(setDueCards)
      .catch((e: unknown) => setError(errorText(e)))
    listRecurringCorrections()
      .then((list) => setRecurring(list[0] ?? null))
      .catch((e: unknown) => setError(errorText(e)))
  }, [])

  useEffect(() => {
    reload()
    listTutors()
      .then(setTutors)
      .catch((e: unknown) => setError(errorText(e)))
    return subscribeLessons(reload)
  }, [reload])

  const summary = dueCards > 0 || recurring !== null

  return (
    <Page
      title="Уроки"
      action={
        <Button variant="secondary" size="sm" aria-label="Загрузить урок" onClick={() => setSheetOpen(true)}>
          <UploadIcon size={18} />
          Загрузить
        </Button>
      }
    >
      {summary && (
        <p className="px-6 pt-3.5 font-serif text-base italic text-muted" data-testid="summary">
          {dueCards > 0 && <>К повторению сегодня — {pluralCards(dueCards)}.</>}
          {dueCards > 0 && recurring && ' '}
          {recurring && (
            <>
              Повторяющаяся ошибка: <s className="text-pen-red decoration-[1.5px]">{recurring.original}</s>{' '}
              <strong className="font-semibold text-ink-green">{recurring.corrected}</strong>.
            </>
          )}
        </p>
      )}

      {error && <p className="px-6 pt-4 text-[13px] text-pen-red">{error}</p>}

      {lessons === null && !error && <div className="h-24" aria-busy />}

      {lessons?.length === 0 && (
        <p className="px-6 pt-7 font-serif text-base italic text-muted">
          Уроков пока нет.{' '}
          <button type="button" className="underline decoration-border-strong underline-offset-4 text-text" onClick={() => setSheetOpen(true)}>
            Загрузи первую запись
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
                <span className="font-serif text-[15px] italic leading-[1.3] text-muted">{formatLessonDate(lesson.date)}</span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-serif text-lg font-semibold leading-[1.25]">
                    {lesson.tutor ? `${lesson.tutor.name} · ${LANGUAGE_LABELS[lesson.tutor.language]}` : 'Репетитор удалён'}
                  </span>
                  {lesson.status === 'ready' ? (
                    <span className="text-[13px] text-muted">{formatEntryBreakdown(lesson.entryCount, lesson.counts)}</span>
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
