import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listEntriesByLesson } from '@/api/entries'
import { getLesson, requestTranscription, subscribeLessons, type LessonWithTutor } from '@/api/lessons'
import type { Entry, EntryType } from '@/api/types'
import { Page } from '@/app/Page'
import { useErrorText, useLocale, useT, type TextKey } from '@/i18n'
import { Button, HairlineBlock, HairlineList, ReviewIcon } from '@/ui'
import { formatLessonDate } from './format'
import { StatusLine } from './StatusLine'

const GROUPS: { type: EntryType; title: TextKey }[] = [
  { type: 'correction', title: 'lesson.corrections' },
  { type: 'vocab', title: 'lesson.vocab' },
  { type: 'rule', title: 'lesson.rules' },
]

const LONG_ORIGINAL = 60

export interface LessonPageProps {
  embedded?: boolean
}

export function LessonPage({ embedded = false }: LessonPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const { lang } = useLocale()
  const errorText = useErrorText()
  const [lesson, setLesson] = useState<LessonWithTutor | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  const [retryError, setRetryError] = useState<unknown>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!id) return
    getLesson(id).then(setLesson).catch(setLoadError)
    return subscribeLessons((changed) => {
      if (changed.id === id) setLesson((prev) => (prev ? { ...prev, ...changed } : prev))
    })
  }, [id])

  const status = lesson?.status
  useEffect(() => {
    if (!id || status !== 'ready') return
    listEntriesByLesson(id).then(setEntries).catch(setLoadError)
  }, [id, status])

  async function retry() {
    if (!id) return
    setRetrying(true)
    setRetryError(null)
    try {
      await requestTranscription(id)
    } catch (e) {
      setRetryError(e)
    } finally {
      setRetrying(false)
    }
  }

  const back = embedded ? undefined : { to: '/', label: t('tabs.lessons') }
  const column = embedded ? 'lg:ml-0 lg:max-w-[720px]' : undefined

  if (loadError !== null && !lesson) {
    return (
      <Page title={t('lesson.title')} back={back} className={column}>
        <p className="px-6 pt-6 text-[13px] text-pen-red">{errorText(loadError)}</p>
      </Page>
    )
  }

  if (!lesson) return <div className="h-24" aria-busy />

  const ready = lesson.status === 'ready'
  const tutorLine = lesson.tutor ? `${lesson.tutor.name} · ${t(`language.${lesson.tutor.language}`)}` : t('lessons.tutorDeleted')
  const groups = GROUPS.map((g) => ({ ...g, items: entries.filter((e) => e.type === g.type) })).filter(
    (g) => g.items.length > 0,
  )
  const showReview = ready && entries.length > 0

  return (
    <Page
      title={formatLessonDate(lesson.date, lang)}
      subtitle={ready ? `${tutorLine} · ${t.plural('entries', entries.length)}` : tutorLine}
      back={back}
      className={column}
    >
      {lesson.status !== 'ready' && (
        <div className="flex flex-col items-start gap-4 px-6 pt-6">
          <StatusLine status={lesson.status} error={lesson.error} className="text-[15px]" />
          {lesson.status === 'failed' && (
            <>
              {retryError !== null && <p className="text-[13px] text-pen-red">{errorText(retryError)}</p>}
              <Button variant="secondary" size="sm" loading={retrying} onClick={() => void retry()}>
                {t('lesson.retry')}
              </Button>
            </>
          )}
        </div>
      )}

      {loadError !== null && <p className="px-6 pt-6 text-[13px] text-pen-red">{errorText(loadError)}</p>}

      {ready && groups.length === 0 && <p className="px-6 pt-6 font-serif italic text-muted">{t('lesson.noEntries')}</p>}

      <div>
        {groups.map((g) => (
          <Section key={g.type} title={t(g.title)} count={g.items.length}>
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
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{t('lesson.transcript')}</summary>
            <p className="whitespace-pre-wrap pt-3 font-serif text-[15px] leading-[1.5] text-muted">{lesson.transcript}</p>
          </details>
        )}
      </div>

      {showReview && (
        <div className="sticky bottom-0 bg-bg px-6 pt-4 pb-2">
          <Button size="lg" full onClick={() => navigate('/review')}>
            <ReviewIcon size={20} />
            {t('lesson.review', { cards: t.plural('cards', entries.length) })}
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
  const t = useT()
  return (
    <>
      {entry.explanation && <p className="text-[13px] text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-[13px]">
          <summary className="cursor-pointer select-none text-faint">{t('lesson.quote')}</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-serif italic text-muted">{entry.quote}</blockquote>
        </details>
      )}
    </>
  )
}
