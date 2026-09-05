import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listEntriesByLesson, type LessonEntry } from '@/api/entries'
import { getLesson, requestTranscription, subscribeLessons, type LessonWithTutor } from '@/api/lessons'
import type { EntryType } from '@/api/types'
import { MQ_TABLET } from '@/app/breakpoints'
import { Page } from '@/app/Page'
import { DeckToggle } from '@/features/review/DeckToggle'
import { useErrorText, useLocale, useT, type TextKey } from '@/i18n'
import { useMediaQuery } from '@/lib/useMediaQuery'
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
  const sideNav = useMediaQuery(MQ_TABLET)
  const [lesson, setLesson] = useState<LessonWithTutor | null>(null)
  const [entries, setEntries] = useState<LessonEntry[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  const [retryError, setRetryError] = useState<unknown>(null)
  const [retrying, setRetrying] = useState(false)
  const [deckError, setDeckError] = useState<unknown>(null)

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

  function setInDeck(id: string, inDeck: boolean) {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, card: inDeck ? { due: new Date().toISOString() } : null } : e)))
  }

  const back = sideNav ? undefined : { to: '/', label: t('tabs.lessons') }
  const width = embedded ? 'lesson' : 'page'

  if (loadError !== null && !lesson) {
    return (
      <Page title={t('lesson.title')} back={back} width={width}>
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
  const now = new Date().toISOString()
  const dueCount = entries.filter((e) => e.card !== null && e.card.due <= now).length
  const textLang = lesson.tutor?.language === 'pl' ? 'pl' : undefined
  const toggle = (entry: LessonEntry) => (
    <DeckToggle
      entryId={entry.id}
      inDeck={entry.card !== null}
      onChange={(inDeck) => setInDeck(entry.id, inDeck)}
      onError={setDeckError}
      className="-my-2.5 shrink-0"
    />
  )

  return (
    <Page
      title={formatLessonDate(lesson.date, lang)}
      subtitle={ready ? `${tutorLine} · ${t.plural('entries', entries.length)}` : tutorLine}
      back={back}
      width={width}
      footer={
        ready && entries.length > 0 ? (
          dueCount > 0 ? (
            <Button size="lg" full onClick={() => navigate('/review')}>
              <ReviewIcon size={20} />
              {t('lesson.review', { cards: t.plural('cards', dueCount) })}
            </Button>
          ) : (
            <p className="flex min-h-13 items-center justify-center text-center font-serif text-base leading-6 italic text-muted">
              {t('lesson.allReviewed')}
            </p>
          )
        ) : undefined
      }
    >
      {lesson.status !== 'ready' && (
        <div className="flex flex-col items-start gap-4 px-6 pt-6">
          <StatusLine status={lesson.status} error={lesson.error} className="text-[15px]" />
          {lesson.status === 'failed' && (
            <>
              {retryError !== null && <p className="text-[13px] leading-5 text-pen-red">{errorText(retryError)}</p>}
              <Button variant="secondary" size="sm" loading={retrying} onClick={() => void retry()}>
                {t('lesson.retry')}
              </Button>
            </>
          )}
        </div>
      )}

      {loadError !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(loadError)}</p>}
      {deckError !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(deckError)}</p>}

      {ready && groups.length === 0 && <p className="px-6 pt-6 font-serif leading-6 italic text-muted">{t('lesson.noEntries')}</p>}

      <div className="pb-6">
        {groups.map((g) => (
          <Section key={g.type} title={t(g.title)} count={g.items.length}>
            {g.type === 'vocab' ? (
              <HairlineBlock className="grid grid-cols-1 gap-x-5 gap-y-6 pl-6 pr-3 sm:grid-cols-2">
                {g.items.map((entry) => (
                  <VocabItem key={entry.id} entry={entry} lang={textLang} toggle={toggle(entry)} />
                ))}
              </HairlineBlock>
            ) : (
              <HairlineList>
                {g.items.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 pl-6 pr-3 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {g.type === 'correction' ? (
                        <CorrectionText entry={entry} lang={textLang} />
                      ) : (
                        <p lang={textLang} className="font-serif text-lg leading-6 wrap-anywhere">
                          {entry.original}
                        </p>
                      )}
                      <EntryMeta entry={entry} />
                    </div>
                    {toggle(entry)}
                  </li>
                ))}
              </HairlineList>
            )}
          </Section>
        ))}

        {lesson.transcript && (
          <details className="px-6 pt-6">
            <summary className="cursor-pointer select-none text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">
              {t('lesson.transcript')}
            </summary>
            <p lang={textLang} className="whitespace-pre-wrap font-serif text-[15px] leading-6 text-muted">
              {lesson.transcript}
            </p>
          </details>
        )}
      </div>
    </Page>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="pt-6">
      <h2 className="px-6 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">
        {title} · {count}
      </h2>
      {children}
    </section>
  )
}

function CorrectionText({ entry, lang }: { entry: LessonEntry; lang?: string }) {
  const original = <s className="text-pen-red decoration-[1.5px]">{entry.original}</s>
  const corrected = entry.corrected && <strong className="font-semibold text-ink-green">{entry.corrected}</strong>
  const stacked = entry.original.length > LONG_ORIGINAL
  return (
    <p lang={lang} className="font-serif text-lg leading-6 wrap-anywhere">
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

function VocabItem({ entry, lang, toggle }: { entry: LessonEntry; lang?: string; toggle: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span lang={lang} className="font-serif text-lg leading-6 font-semibold wrap-anywhere">
          {entry.original}
        </span>
        {entry.corrected && <span className="text-[13px] leading-5 text-muted">{entry.corrected}</span>}
        <EntryMeta entry={entry} />
      </div>
      {toggle}
    </div>
  )
}

function EntryMeta({ entry }: { entry: LessonEntry }) {
  const t = useT()
  return (
    <>
      {entry.explanation && <p className="text-[13px] leading-5 text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-[13px] leading-5">
          <summary className="cursor-pointer select-none text-faint">{t('lesson.quote')}</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-serif italic text-muted">{entry.quote}</blockquote>
        </details>
      )}
    </>
  )
}
