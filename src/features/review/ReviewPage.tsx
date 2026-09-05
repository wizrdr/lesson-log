import { useEffect, useMemo, useState } from 'react'
import { deckStats, listDueCards, previewIntervals, reviewCard, Grades, type DeckStats, type DueCard, type Grade } from '@/api/cards'
import type { EntryType } from '@/api/types'
import { Page } from '@/app/Page'
import { useErrorText, useLocale, useT, type TextKey } from '@/i18n'
import { Button, cn, type ButtonVariant } from '@/ui'
import { formatLessonDate } from '@/features/lessons/format'

const PROMPT: Record<EntryType, TextKey> = {
  correction: 'review.promptCorrection',
  vocab: 'review.promptVocab',
  rule: 'review.promptRule',
}

const RATINGS: { grade: Grade; label: TextKey; variant: ButtonVariant }[] = [
  { grade: Grades[0], label: 'review.again', variant: 'danger' },
  { grade: Grades[1], label: 'review.hard', variant: 'secondary' },
  { grade: Grades[2], label: 'review.good', variant: 'primary' },
  { grade: Grades[3], label: 'review.easy', variant: 'secondary' },
]

const KEY_TO_GRADE: Record<string, Grade> = { '1': Grades[0], '2': Grades[1], '3': Grades[2], '4': Grades[3] }

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function ReviewPage() {
  const t = useT()
  const errorText = useErrorText()
  const [queue, setQueue] = useState<DueCard[] | null>(null)
  const [stats, setStats] = useState<DeckStats | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saveError, setSaveError] = useState<unknown>(null)

  useEffect(() => {
    listDueCards().then(setQueue).catch(setLoadError)
    deckStats().then(setStats).catch(setLoadError)
  }, [])

  const current = queue?.[0] ?? null
  const intervals = useMemo(() => (current ? previewIntervals(current, t) : null), [current, t])

  async function grade(g: Grade) {
    if (!current || !flipped) return
    setSaveError(null)
    setFlipped(false)
    setQueue((q) => (q ? q.slice(1) : q))
    setReviewed((n) => n + 1)
    setStats((s) => (s ? { ...s, due: s.due - 1, new: current.state === 0 ? s.new - 1 : s.new } : s))
    try {
      await reviewCard(current, g)
    } catch (e) {
      setSaveError(e)
      setFlipped(true)
      setQueue((q) => [current, ...(q ?? [])])
      setReviewed((n) => n - 1)
      setStats((s) => (s ? { ...s, due: s.due + 1, new: current.state === 0 ? s.new + 1 : s.new } : s))
    }
  }

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped(true)
        return
      }
      const g = KEY_TO_GRADE[e.key]
      if (g && flipped) void grade(g)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Page title={t('tabs.review')} className="lg:ml-auto lg:mr-auto">
      {stats && (
        <dl className="grid grid-cols-3 gap-4 px-6 pt-5" data-testid="deck-stats">
          <Stat label={t('review.due')} value={stats.due} />
          <Stat label={t('review.new')} value={stats.new} />
          <Stat label={t('review.total')} value={stats.total} />
        </dl>
      )}

      {loadError !== null && <p className="px-6 pt-6 text-[13px] text-pen-red">{errorText(loadError)}</p>}

      {queue === null && loadError === null && <div className="h-24" aria-busy />}

      {queue && !current && (
        <p className="px-6 pt-10 font-serif text-lg italic text-muted">
          {t('review.done')}
          {reviewed > 0 && <> {t('review.session', { cards: t.plural('cards', reviewed) })}</>}
        </p>
      )}

      {current && (
        <div className="flex flex-col gap-5 pt-8">
          <Card card={current} flipped={flipped} onFlip={() => setFlipped(true)} />

          {saveError !== null && <p className="px-6 text-[13px] text-pen-red">{errorText(saveError)}</p>}

          {flipped && intervals && (
            <div className="grid grid-cols-4 gap-2 px-6" data-testid="ratings">
              {RATINGS.map(({ grade: g, label, variant }) => (
                <div key={g} className="flex min-w-0 flex-col items-center gap-1.5">
                  <Button variant={variant} size="sm" full className="min-w-0" onClick={() => void grade(g)}>
                    {t(label)}
                  </Button>
                  <span className="text-[12px] text-faint">{intervals[g]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</dt>
      <dd className="m-0 font-serif text-[28px] font-semibold leading-none tracking-[-0.01em]">{value}</dd>
    </div>
  )
}

function Card({ card, flipped, onFlip }: { card: DueCard; flipped: boolean; onFlip: () => void }) {
  const t = useT()
  const { lang } = useLocale()
  const { entry } = card

  const face = (
    <button
      type="button"
      onClick={onFlip}
      aria-label={t('review.showAnswer')}
      className="flex w-full flex-col items-start gap-3 px-6 py-8 text-left focus-ring-inset"
    >
      <span
        className={cn(
          'font-serif font-semibold leading-[1.25] tracking-[-0.01em]',
          entry.type === 'vocab' ? 'text-[28px]' : 'text-[24px]',
        )}
      >
        {entry.original}
      </span>
      <span className="font-serif text-base italic text-muted">{t(PROMPT[entry.type])}</span>
    </button>
  )

  const lessonLine = entry.lesson
    ? [formatLessonDate(entry.lesson.date, lang), entry.lesson.tutor?.name].filter(Boolean).join(' · ')
    : t('review.manual')

  const back = (
    <div className="flex flex-col gap-3 px-6 py-8" data-testid="card-back">
      {entry.type === 'correction' ? (
        <s className="font-serif text-lg leading-[1.3] text-pen-red decoration-[1.5px]">{entry.original}</s>
      ) : (
        <p className="font-serif text-lg leading-[1.3] text-muted">{entry.original}</p>
      )}
      {entry.corrected && (
        <strong className="font-serif text-[24px] font-semibold leading-[1.25] text-ink-green">{entry.corrected}</strong>
      )}
      {entry.explanation && <p className="text-[15px] leading-[1.45] text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-[13px]">
          <summary className="cursor-pointer select-none text-faint">{t('lesson.quote')}</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-serif italic text-muted">{entry.quote}</blockquote>
        </details>
      )}
      <p className="pt-1 text-[12px] text-faint">{lessonLine}</p>
    </div>
  )

  return <div className="border-y border-border bg-surface">{flipped ? back : face}</div>
}
