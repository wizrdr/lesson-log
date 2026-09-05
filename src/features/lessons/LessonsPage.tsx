import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLessons, subscribeLessons, type LessonListItem } from '@/api/lessons'
import { listTutors } from '@/api/tutors'
import type { Tutor } from '@/api/types'
import { Page } from '@/app/Page'
import { Button, Card } from '@/ui'
import { LANGUAGE_LABELS, formatLessonDate, pluralEntries } from './format'
import { StatusBadge } from './StatusBadge'
import { UploadSheet } from './UploadSheet'

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function LessonsPage() {
  const [lessons, setLessons] = useState<LessonListItem[] | null>(null)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const reload = useCallback(() => {
    listLessons()
      .then((rows) => {
        setLessons(rows)
        setError(null)
      })
      .catch((e: unknown) => setError(errorText(e)))
  }, [])

  useEffect(() => {
    reload()
    listTutors()
      .then(setTutors)
      .catch((e: unknown) => setError(errorText(e)))
    return subscribeLessons(reload)
  }, [reload])

  return (
    <Page
      title="Уроки"
      action={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Загрузить урок
        </Button>
      }
    >
      {error && <p className="text-sm text-danger">{error}</p>}

      {lessons === null && !error && <div className="h-24" aria-busy />}

      {lessons?.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-muted">Уроков пока нет</p>
          <Button variant="soft" onClick={() => setSheetOpen(true)}>
            Загрузить первый урок
          </Button>
        </Card>
      )}

      {lessons && lessons.length > 0 && (
        <Card padded={false} className="divide-y divide-border">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/lessons/${lesson.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-text">{formatLessonDate(lesson.date)}</span>
                <span className="truncate text-sm text-muted">
                  {lesson.tutor ? `${lesson.tutor.name} · ${LANGUAGE_LABELS[lesson.tutor.language]}` : 'Репетитор удалён'}
                </span>
              </span>
              <StatusBadge
                status={lesson.status}
                suffix={lesson.status === 'ready' ? pluralEntries(lesson.entryCount) : undefined}
              />
            </Link>
          ))}
        </Card>
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
