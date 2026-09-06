import { useEffect, useMemo, useState } from 'react'
import { deckStats, listDueCards, previewIntervals, reviewCard, Grades, type DeckStats, type DueCard, type Grade } from '@/api/cards'
import type { EntryType } from '@/api/types'
import { Page } from '@/app/Page'
import { useErrorText, useLocale, useT, type TextKey } from '@/i18n'
import { Button, IndexCard, cn, type ButtonVariant } from '@/ui'
import { formatLessonDate } from '@/features/lessons/format'

const HINT: Record<EntryType, TextKey> = {
  correction: 'review.hintCorrection',
  vocab: 'review.hintVocab',
  rule: 'review.hintRule',
}

const TYPE: Record<EntryType, TextKey> = {
  correction: 'type.correction',
  vocab: 'type.vocab',
  rule: 'type.rule',
}

const RATINGS: { grade: Grade; label: TextKey; variant: ButtonVariant }[] = [
  { grade: Grades[0], label: 'review.again', variant: 'danger' },
  { grade: Grades[1], label: 'review.hard', variant: 'secondary' },
  { grade: Grades[2], label: 'review.good', variant: 'primary' },
  { grade: Grades[3], label: 'review.easy', variant: 'secondary' },
]

const KEY_TO_GRADE: Record<string, Grade> = { '1': Grades[0], '2': Grades[1], '3': Grades[2], '4': Grades[3] }
const SKIP_KEYS = new Set(['s', 'ы'])

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

  const progress =
    current && queue
      ? t('review.progress', {
          i: reviewed + 1,
          total: reviewed + queue.length,
          fresh: t.plural('fresh', queue.filter((c) => c.state === 0).length),
        })
      : undefined

  function skip() {
    if (!current) return
    setSaveError(null)
    setFlipped(false)
    setQueue((q) => (q && q.length > 1 ? [...q.slice(1), q[0]] : q))
  }

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
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped(true)
        return
      }
      if (SKIP_KEYS.has(e.key.toLowerCase())) {
        skip()
        return
      }
      const g = KEY_TO_GRADE[e.key]
      if (g && flipped) void grade(g)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Page title={t('tabs.review')} subtitle={progress}>
      {stats && (
        <dl className="m-0 flex gap-6 px-6 pt-6" data-testid="deck-stats">
          <Stat label={t('review.due')} value={stats.due} />
          <Stat label={t('review.new')} value={stats.new} />
          <Stat label={t('review.total')} value={stats.total} />
        </dl>
      )}

      {loadError !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(loadError)}</p>}

      {queue === null && loadError === null && <div className="h-24" aria-busy />}

      {queue && !current && (
        <div className="px-6 pt-8">
          <IndexCard className="flex min-h-40 flex-col justify-center gap-1 font-serif text-lg leading-6 italic text-muted">
            <p>{t('review.done')}</p>
            {reviewed > 0 && <p>{t('review.session', { cards: t.plural('cards', reviewed) })}</p>}
          </IndexCard>
        </div>
      )}

      {current && (
        <div className="flex flex-col gap-5 px-6 pt-8">
          <Card card={current} flipped={flipped} onFlip={() => setFlipped(true)} />

          {saveError !== null && <p className="text-[13px] leading-5 text-pen-red">{errorText(saveError)}</p>}

          {!flipped && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button variant="secondary" onClick={skip}>
                  {t('review.skip')}
                </Button>
                <Button variant="primary" className="flex-1" onClick={() => setFlipped(true)}>
                  {t('review.showAnswer')}
                </Button>
              </div>
              <p className="hidden text-center text-[12px] text-faint md:block">{t('review.keys')}</p>
            </div>
          )}

          {flipped && intervals && (
            <div className="grid grid-cols-4 gap-2" data-testid="ratings">
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
    <div className="flex flex-col">
      <dt className="text-[11px] leading-5 font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-faint">{label}</dt>
      <dd className="m-0 font-serif text-[28px] leading-7 font-semibold tracking-[-0.01em]">{value}</dd>
    </div>
  )
}

function Card({ card, flipped, onFlip }: { card: DueCard; flipped: boolean; onFlip: () => void }) {
  const t = useT()
  const { lang } = useLocale()
  const { entry } = card
  const textLang = entry.lang ?? entry.lesson?.tutor?.language

  const meta = (
    <span className="text-[11px] leading-4 font-semibold uppercase tracking-[0.12em] text-faint" data-testid="card-meta">
      {[t(TYPE[entry.type]), textLang?.toUpperCase(), entry.lesson ? formatLessonDate(entry.lesson.date, lang) : t('review.manual')]
        .filter(Boolean)
        .join(' · ')}
    </span>
  )

  if (!flipped) {
    return (
      <IndexCard interactive onClick={onFlip} className="flex min-h-56 flex-col gap-6" data-testid="card-face">
        {meta}
        <span
          lang={textLang}
          className={cn(
            'my-auto self-center text-center font-serif font-semibold leading-[1.25] tracking-[-0.01em] wrap-anywhere',
            entry.type === 'vocab' ? 'text-[28px]' : 'text-[22px]',
          )}
        >
          {entry.original}
        </span>
        <span className="text-center text-[13px] leading-5 text-muted">{t(HINT[entry.type])}</span>
      </IndexCard>
    )
  }

  const lessonLine = entry.lesson
    ? [formatLessonDate(entry.lesson.date, lang), entry.lesson.tutor?.name].filter(Boolean).join(' · ')
    : t('review.manual')

  return (
    <IndexCard className="flex flex-col gap-3" data-testid="card-back">
      {meta}
      {entry.type === 'correction' ? (
        <s lang={textLang} className="font-serif text-lg leading-6 text-pen-red decoration-[1.5px] wrap-anywhere">
          {entry.original}
        </s>
      ) : (
        <p lang={textLang} className="font-serif text-lg leading-6 text-muted wrap-anywhere">
          {entry.original}
        </p>
      )}
      {entry.corrected && (
        <strong lang={textLang} className="font-serif text-[24px] font-semibold leading-[1.25] text-ink-green wrap-anywhere">
          {entry.corrected}
        </strong>
      )}
      {entry.explanation && <p className="text-[15px] leading-[1.45] text-muted">{entry.explanation}</p>}
      {entry.quote && (
        <details className="text-[13px]">
          <summary className="cursor-pointer select-none text-faint">{t('lesson.quote')}</summary>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-serif italic text-muted">{entry.quote}</blockquote>
        </details>
      )}
      <p className="pt-1 text-[12px] text-faint">{lessonLine}</p>
    </IndexCard>
  )
}
