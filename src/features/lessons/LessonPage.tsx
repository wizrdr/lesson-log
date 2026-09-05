import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listEntriesByLesson } from '@/api/entries'
import { getLesson, requestTranscription, subscribeLessons, type LessonWithTutor } from '@/api/lessons'
import type { Entry, EntryType, LessonStatus } from '@/api/types'
import { Page } from '@/app/Page'
import { Button, Card } from '@/ui'
import { LANGUAGE_LABELS, formatLessonDate, pluralEntries } from './format'
import { StatusBadge } from './StatusBadge'

const GROUPS: { type: EntryType; title: string }[] = [
  { type: 'correction', title: 'Исправления' },
  { type: 'vocab', title: 'Слова' },
  { type: 'rule', title: 'Правила' },
]

const STATUS_HINT: Record<Exclude<LessonStatus, 'ready' | 'failed'>, string> = {
  uploaded: 'Файл загружен, расшифровка скоро начнётся.',
  transcribing: 'Расшифровываем запись — обычно 2–5 минут.',
  extracting: 'Ищем исправления в транскрипте — ещё минуту-две.',
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function LessonPage() {
  const { id } = useParams()
  const [lesson, setLesson] = useState<LessonWithTutor | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!id) return
    getLesson(id)
      .then(setLesson)
      .catch((e: unknown) => setLoadError(errorText(e)))
    return subscribeLessons((changed) => {
      if (changed.id === id) setLesson((prev) => (prev ? { ...prev, ...changed } : prev))
    })
  }, [id])

  const status = lesson?.status
  useEffect(() => {
    if (!id || status !== 'ready') return
    listEntriesByLesson(id)
      .then(setEntries)
      .catch((e: unknown) => setLoadError(errorText(e)))
  }, [id, status])

  async function retry() {
    if (!id) return
    setRetrying(true)
    setRetryError(null)
    try {
      await requestTranscription(id)
    } catch (e) {
      setRetryError(errorText(e))
    } finally {
      setRetrying(false)
    }
  }

  if (loadError && !lesson) {
    return (
      <Page title="Урок">
        <p className="text-sm text-danger">{loadError}</p>
        <Link to="/" className="text-sm text-accent">
          ← К списку уроков
        </Link>
      </Page>
    )
  }

  if (!lesson) return <div className="h-24" aria-busy />

  const groups = GROUPS.map((g) => ({ ...g, items: entries.filter((e) => e.type === g.type) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <Page
      title={formatLessonDate(lesson.date)}
      subtitle={lesson.tutor ? `${lesson.tutor.name} · ${LANGUAGE_LABELS[lesson.tutor.language]}` : undefined}
      action={
        <Link to="/" className="text-sm text-accent">
          Уроки
        </Link>
      }
    >
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted">Статус</span>
          <StatusBadge status={lesson.status} />
        </div>
        {lesson.status === 'ready' && <p className="text-sm text-muted">{pluralEntries(entries.length)}</p>}
        {lesson.status === 'failed' && (
          <>
            <p className="text-sm text-danger">{lesson.error ?? 'Неизвестная ошибка'}</p>
            {retryError && <p className="text-sm text-danger">{retryError}</p>}
            <Button variant="soft" size="sm" loading={retrying} onClick={() => void retry()}>
              Повторить
            </Button>
          </>
        )}
        {lesson.status !== 'ready' && lesson.status !== 'failed' && (
          <p className="text-sm text-muted">{STATUS_HINT[lesson.status]}</p>
        )}
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
      </Card>

      {lesson.status === 'ready' && groups.length === 0 && (
        <Card className="py-8 text-center">
          <p className="text-muted">Исправлений не нашлось</p>
        </Card>
      )}

      {groups.map((g) => (
        <section key={g.type} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted">
            {g.title} <span className="text-faint">{g.items.length}</span>
          </h2>
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {g.items.map((entry) => (
                <EntryItem key={entry.id} entry={entry} />
              ))}
            </ul>
          </Card>
        </section>
      ))}

      {lesson.transcript && (
        <details>
          <summary className="cursor-pointer select-none px-1 text-sm font-medium text-muted">Транскрипт</summary>
          <Card className="mt-2">
            <p className="whitespace-pre-wrap text-sm text-muted">{lesson.transcript}</p>
          </Card>
        </details>
      )}
    </Page>
  )
}

function EntryItem({ entry }: { entry: Entry }) {
  const isCorrection = entry.type === 'correction' && entry.corrected !== null
  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <p className="text-text">
        {isCorrection ? (
          <>
            <span className="text-muted line-through">{entry.original}</span>
            <span aria-hidden className="text-faint">
              {' → '}
            </span>
            <span className="font-medium">{entry.corrected}</span>
          </>
        ) : (
          <>
            <span className="font-medium">{entry.original}</span>
            {entry.corrected && <span className="text-muted"> — {entry.corrected}</span>}
          </>
        )}
      </p>
      {entry.explanation && <p className="text-sm text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-faint">Цитата из транскрипта</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 text-muted italic">{entry.quote}</blockquote>
        </details>
      )}
    </li>
  )
}
