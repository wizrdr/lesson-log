import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLevel, type LevelDoc } from '@/api/level'
import { Page } from '@/app/Page'
import { formatLessonDate } from '@/features/lessons/format'
import { safeHref } from '@/features/course/markup'
import { useErrorText, useLocale, useT, type TextKey } from '@/i18n'
import { ChevronRightIcon, cn, HairlineList } from '@/ui'
import { SKILLS, TOPIC_STATUSES, type LevelTest, type Score, type SkillKey } from '../../../supabase/functions/_shared/level-input.ts'
import { pct, tone } from './score'

function latestScore(tests: LevelTest[], key: SkillKey): { score: Score; index: number } | null {
  for (let i = tests.length - 1; i >= 0; i--) {
    const s = tests[i].scores[key]
    if (s) return { score: s, index: i }
  }
  return null
}

export function LevelPage() {
  const t = useT()
  const errorText = useErrorText()
  const { lang } = useLocale()
  const [doc, setDoc] = useState<LevelDoc | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    getLevel().then(setDoc).catch(setError)
  }, [])

  return (
    <Page title={t('level.title')} subtitle={doc?.summary.overall}>
      {error !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}
      {doc === undefined && error === null && <div className="h-24" aria-busy />}
      {doc === null && <p className="px-6 pt-6 font-serif leading-6 italic text-muted">{t('level.empty')}</p>}
      {doc && (
        <>
          {doc.summary.verdict && <p className="m-0 px-6 pt-3 font-serif text-[17px] leading-6">{doc.summary.verdict}</p>}
          <p className="m-0 px-6 pt-2 text-[13px] leading-5 text-faint">{t('level.updated', { date: formatLessonDate(doc.summary.updated_on, lang) })}</p>
          <Skills doc={doc} />
          <Tests tests={doc.tests} />
          <Topics doc={doc} />
          <Checkpoints doc={doc} />
        </>
      )}
    </Page>
  )
}

function SectionTitle({ label }: { label: TextKey }) {
  const t = useT()
  return <h2 className="px-6 pt-8 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{t(label)}</h2>
}

function Bar({ p }: { p: number }) {
  return (
    <div className="relative h-1.5 rounded-full bg-surface-raised" aria-hidden>
      <div className={cn('h-full rounded-full', tone(p).bar)} style={{ width: `${p}%` }} />
      <div className="absolute inset-y-[-3px] left-1/2 w-px bg-border-strong" />
    </div>
  )
}

function Skills({ doc }: { doc: LevelDoc }) {
  const t = useT()
  const byKey = new Map(doc.skills.map((s) => [s.key, s]))
  const keys = SKILLS.filter((k) => byKey.has(k) || latestScore(doc.tests, k))
  if (keys.length === 0) return null
  return (
    <section data-testid="level-skills">
      <SectionTitle label="level.skills" />
      <HairlineList>
        {keys.map((key) => {
          const skill = byKey.get(key)
          const latest = latestScore(doc.tests, key)
          const p = latest ? pct(latest.score) : null
          return (
            <li key={key} className="px-6 py-3" data-testid={`skill-${key}`}>
              <div className="flex items-baseline gap-3">
                <span className="flex-1 text-[15px] leading-6 font-semibold">{t(`level.skill.${key}`)}</span>
                {skill && <span className="rounded-sm border border-border-strong px-1.5 text-[12px] leading-5 font-semibold">{skill.cefr}</span>}
                <span className={cn('w-12 text-right text-[15px] leading-6 font-semibold tabular-nums', p === null ? 'text-faint' : tone(p).text)}>
                  {p === null ? t('level.notMeasured') : `${p}%`}
                </span>
              </div>
              {p !== null && (
                <div className="pt-1.5">
                  <Bar p={p} />
                </div>
              )}
              {skill?.note && <p className="m-0 pt-1.5 font-serif text-[15px] leading-6 italic text-muted">{skill.note}</p>}
            </li>
          )
        })}
      </HairlineList>
      <p className="m-0 px-6 pt-2 text-[12px] leading-5 text-faint">{t('level.threshold')}</p>
    </section>
  )
}

function Tests({ tests }: { tests: LevelTest[] }) {
  const t = useT()
  const { lang } = useLocale()
  if (tests.length === 0) return null
  return (
    <section data-testid="level-tests">
      <SectionTitle label="level.tests" />
      <HairlineList>
        {[...tests].reverse().map((test) => {
          const prev = tests[tests.indexOf(test) - 1]
          const link = test.url ? safeHref(test.url) : null
          return (
            <li key={test.id} className="px-6 py-3" data-testid={`test-${test.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-[16px] leading-6 font-semibold">{test.title}</span>
                <span className="shrink-0 text-[13px] leading-5 text-muted">{formatLessonDate(test.date, lang)}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 pt-2">
                {SKILLS.map((key) => {
                  const s = test.scores[key]
                  const p = s ? pct(s) : null
                  const before = prev?.scores[key]
                  const delta = p !== null && before ? p - pct(before) : null
                  return (
                    <div key={key} className="flex flex-col items-center">
                      <span className="text-[10px] leading-4 uppercase tracking-[0.06em] text-faint">{t(`level.short.${key}`)}</span>
                      <span className={cn('text-[15px] leading-6 font-semibold tabular-nums', p === null ? 'text-faint' : tone(p).text)}>
                        {p === null ? t('level.notMeasured') : `${p}%`}
                      </span>
                      {delta !== null && delta !== 0 && (
                        <span className={cn('text-[11px] leading-4 tabular-nums', delta > 0 ? 'text-ink-green' : 'text-pen-red')}>
                          {delta > 0 ? `↑${delta}` : `↓${-delta}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {test.note && <p className="m-0 pt-2 font-serif text-[14px] leading-5 italic text-muted">{test.note}</p>}
              {link?.kind === 'external' && (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] font-medium text-muted underline underline-offset-2 focus-ring">
                  {t('level.source')}
                </a>
              )}
            </li>
          )
        })}
      </HairlineList>
    </section>
  )
}

const TOPIC_ORDER = ['in_progress', 'open', 'closed'] as const satisfies readonly (typeof TOPIC_STATUSES)[number][]

function Topics({ doc }: { doc: LevelDoc }) {
  const t = useT()
  if (doc.topics.length === 0) return null
  return (
    <section data-testid="level-topics">
      <SectionTitle label="level.topics" />
      {TOPIC_ORDER.map((status) => {
        const list = doc.topics.filter((x) => x.status === status)
        if (list.length === 0) return null
        return (
          <div key={status} className="pt-3">
            <h3 className={cn('px-6 text-[12px] leading-6 font-semibold', status === 'in_progress' ? 'text-text' : 'text-muted')}>{t(`level.topic.${status}`)}</h3>
            <HairlineList>
              {list.map((topic) => {
                const body = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn('font-serif text-[16px] leading-6', status === 'closed' ? 'text-faint line-through' : 'font-semibold')}>{topic.title}</span>
                      <span className="text-[12px] leading-5 text-faint">
                        {t(`level.skill.${topic.skill}`)}
                        {topic.note ? ` · ${topic.note}` : ''}
                      </span>
                    </span>
                    {topic.item_slug && (
                      <span className="flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-muted">
                        {t('level.openInCourse')} <ChevronRightIcon size={16} />
                      </span>
                    )}
                  </>
                )
                return (
                  <li key={topic.id} data-testid={`topic-${topic.id}`}>
                    {topic.item_slug ? (
                      <Link to={`/course/${topic.item_slug}`} className="flex min-h-14 items-center gap-3 px-6 py-2 transition-colors duration-fast hover:bg-surface-raised focus-ring-inset">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex min-h-14 items-center gap-3 px-6 py-2">{body}</div>
                    )}
                  </li>
                )
              })}
            </HairlineList>
          </div>
        )
      })}
    </section>
  )
}

const CP_TONE = { upcoming: 'text-faint', passed: 'text-ink-green', failed: 'text-pen-red' } as const

function Checkpoints({ doc }: { doc: LevelDoc }) {
  const t = useT()
  const { lang } = useLocale()
  if (doc.checkpoints.length === 0) return null
  return (
    <section data-testid="level-checkpoints">
      <SectionTitle label="level.checkpoints" />
      <HairlineList>
        {doc.checkpoints.map((cp) => (
          <li key={cp.id} className="flex gap-4 px-6 py-3">
            <span className="w-16 shrink-0 text-[13px] leading-6 tabular-nums text-muted">{formatLessonDate(cp.date, lang)}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-serif text-[16px] leading-6 font-semibold">{cp.title}</span>
              {cp.rule && <span className="font-serif text-[14px] leading-5 italic text-muted">{cp.rule}</span>}
            </span>
            <span className={cn('shrink-0 text-[12px] leading-6 font-semibold', CP_TONE[cp.status])}>{t(`level.cp.${cp.status}`)}</span>
          </li>
        ))}
      </HairlineList>
    </section>
  )
}
