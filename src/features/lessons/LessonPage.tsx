import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listEntriesByLesson } from '@/api/entries'
import { getLesson, requestTranscription, subscribeLessons, type LessonWithTutor } from '@/api/lessons'
import type { Entry, EntryType } from '@/api/types'
import { Page } from '@/app/Page'
import { Button, HairlineBlock, HairlineList, ReviewIcon } from '@/ui'
import { LANGUAGE_LABELS, formatLessonDate, pluralCards, pluralEntries } from './format'
import { StatusLine } from './StatusLine'

const GROUPS: { type: EntryType; title: string }[] = [
  { type: 'correction', title: 'Исправления' },
  { type: 'vocab', title: 'Слова' },
  { type: 'rule', title: 'Правила' },
]

const LONG_ORIGINAL = 60

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
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

  const back = { to: '/', label: 'Уроки' }

  if (loadError && !lesson) {
    return (
      <Page title="Урок" back={back}>
        <p className="px-6 pt-6 text-[13px] text-pen-red">{loadError}</p>
      </Page>
    )
  }

  if (!lesson) return <div className="h-24" aria-busy />

  const ready = lesson.status === 'ready'
  const tutorLine = lesson.tutor ? `${lesson.tutor.name} · ${LANGUAGE_LABELS[lesson.tutor.language]}` : 'Репетитор удалён'
  const groups = GROUPS.map((g) => ({ ...g, items: entries.filter((e) => e.type === g.type) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <Page title={formatLessonDate(lesson.date)} subtitle={ready ? `${tutorLine} · ${pluralEntries(entries.length)}` : tutorLine} back={back}>
      {lesson.status !== 'ready' && (
        <div className="flex flex-col items-start gap-4 px-6 pt-6">
          <StatusLine status={lesson.status} error={lesson.error} className="text-[15px]" />
          {lesson.status === 'failed' && (
            <>
              {retryError && <p className="text-[13px] text-pen-red">{retryError}</p>}
              <Button variant="secondary" size="sm" loading={retrying} onClick={() => void retry()}>
                Повторить расшифровку
              </Button>
            </>
          )}
        </div>
      )}

      {loadError && <p className="px-6 pt-6 text-[13px] text-pen-red">{loadError}</p>}

      {ready && groups.length === 0 && <p className="px-6 pt-6 font-serif italic text-muted">Исправлений не нашлось</p>}

      {groups.map((g) => (
        <Section key={g.type} title={g.title} count={g.items.length}>
          {g.type === 'vocab' ? (
            <HairlineBlock className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              {g.items.map((entry) => (
                <VocabItem key={entry.id} entry={entry} />
              ))}
            </HairlineBlock>
          ) : (
            <HairlineList>
              {g.items.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1.5 py-3.5">
                  {g.type === 'correction' ? <CorrectionText entry={entry} /> : <p className="font-serif text-[17px] leading-[1.35]">{entry.original}</p>}
                  <EntryMeta entry={entry} />
                </li>
              ))}
            </HairlineList>
          )}
        </Section>
      ))}

      {lesson.transcript && (
        <details className="px-6 pt-6">
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Транскрипт</summary>
          <p className="whitespace-pre-wrap pt-3 font-serif text-[15px] leading-[1.5] text-muted">{lesson.transcript}</p>
        </details>
      )}

      {ready && entries.length > 0 && (
        <div className="sticky bottom-0 px-6 pt-6 pb-2">
          <Button size="lg" full onClick={() => navigate('/review')}>
            <ReviewIcon size={20} />
            Повторить {pluralCards(entries.length)}
          </Button>
        </div>
      )}
    </Page>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="px-6 pt-6">
      <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
        {title} · {count}
      </h2>
      {children}
    </section>
  )
}

function CorrectionText({ entry }: { entry: Entry }) {
  const original = <s className="text-pen-red decoration-[1.5px]">{entry.original}</s>
  const corrected = entry.corrected && <strong className="font-semibold text-ink-green">{entry.corrected}</strong>
  const stacked = entry.original.length > LONG_ORIGINAL
  return (
    <p className="font-serif text-lg leading-[1.35]">
      {stacked ? (
        <>
          <span className="block">{original}</span>
          {corrected && <span className="block">{corrected}</span>}
        </>
      ) : (
        <>
          {original}
          {corrected && <> {corrected}</>}
        </>
      )}
    </p>
  )
}

function VocabItem({ entry }: { entry: Entry }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-serif text-[17px] font-semibold leading-[1.3]">{entry.original}</span>
      {entry.corrected && <span className="text-[13px] text-muted">{entry.corrected}</span>}
      <EntryMeta entry={entry} />
    </div>
  )
}

function EntryMeta({ entry }: { entry: Entry }) {
  return (
    <>
      {entry.explanation && <p className="text-[13px] text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-[13px]">
          <summary className="cursor-pointer select-none text-faint">Цитата</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-serif italic text-muted">{entry.quote}</blockquote>
        </details>
      )}
    </>
  )
}
