import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listCourseItems, listWeekBodies, loadAllProgress, type Block, type CourseListItem } from '@/api/course'
import { Page } from '@/app/Page'
import { useErrorText, useT, type TextKey } from '@/i18n'
import { CheckIcon, ChevronRightIcon, cn, HairlineList, IndexCard } from '@/ui'
import { buildPlan, isMarkedDone, type AllProgress, type WeekPlan, type WeekStatus } from './plan'
import { useProgressVersion } from './progressBus'
import { RichInline } from './Rich'

export interface CourseListPageProps {
  embedded?: boolean
  selectedSlug?: string
}

interface Loaded {
  items: CourseListItem[]
  bodies: Record<string, Block[]>
  progress: AllProgress
}

export function CourseListPage({ embedded = false, selectedSlug }: CourseListPageProps) {
  const t = useT()
  const errorText = useErrorText()
  const version = useProgressVersion()
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let alive = true
    Promise.all([listCourseItems(), listWeekBodies(), loadAllProgress()])
      .then(([items, bodies, progress]) => alive && setData({ items, bodies, progress }))
      .catch((e) => alive && setError(e))
    return () => {
      alive = false
    }
  }, [version])

  const plan = useMemo(() => (data ? buildPlan(data.items, data.bodies, data.progress) : null), [data])
  const items = data?.items ?? null
  const groups: { label: TextKey; list: CourseListItem[] }[] = items
    ? [
        { label: 'course.lessons', list: items.filter((i) => i.kind === 'lesson') },
        { label: 'course.reference', list: items.filter((i) => i.kind === 'reference') },
      ]
    : []

  return (
    <Page title={t('course.title')} width={embedded ? 'list' : 'page'}>
      {error !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}
      {items === null && error === null && <div className="h-24" aria-busy />}
      {items !== null && items.length === 0 && <p className="px-6 pt-6 font-serif leading-6 italic text-muted">{t('course.empty')}</p>}
      {plan?.focus && <NowCard week={plan.focus} after={plan.after} />}
      {plan && plan.weeks.length > 0 && (
        <Section label="course.plan">
          {plan.weeks.map((w) => (
            <Row
              key={w.item.id}
              item={w.item}
              selected={w.item.slug === selectedSlug}
              lead={<StatusMark status={w.status} />}
              meta={w.total > 0 ? t('course.progress', { n: w.checked, total: w.total }) : null}
            />
          ))}
        </Section>
      )}
      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <Section key={g.label} label={g.label}>
              {g.list.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  selected={item.slug === selectedSlug}
                  lead={item.kind === 'lesson' ? <StatusMark status={isMarkedDone(data?.progress[item.id]) ? 'done' : 'upcoming'} /> : null}
                />
              ))}
            </Section>
          ),
      )}
    </Page>
  )
}

function NowCard({ week, after }: { week: WeekPlan; after: WeekPlan | null }) {
  const t = useT()
  return (
    <section className="px-6 pt-6" data-testid="course-now">
      <h2 className="text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{t('course.now')}</h2>
      <IndexCard className="mt-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="m-0 font-serif text-[19px] leading-6 font-semibold">{week.item.title}</p>
          {week.total > 0 && (
            <span className="shrink-0 text-[13px] tabular-nums text-muted">{t('course.progress', { n: week.checked, total: week.total })}</span>
          )}
        </div>
        {week.item.subtitle && <p className="m-0 font-serif text-[15px] leading-6 italic text-muted">{week.item.subtitle}</p>}
        {week.total > 0 && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
            <div className="h-full bg-ink" style={{ width: `${(week.checked / week.total) * 100}%` }} />
          </div>
        )}
        <div className="pt-4">
          {week.status === 'done' ? (
            <p className="m-0 inline-flex items-center gap-2 text-[15px] font-semibold text-ink-green">
              <CheckIcon size={18} /> {t('course.weekClosed')}
            </p>
          ) : week.next ? (
            <>
              <p className="m-0 text-[11px] leading-5 font-semibold uppercase tracking-[0.08em] text-faint">
                {t('course.nextStep')}
                {week.next.heading ? ` · ${week.next.heading}` : ''}
              </p>
              <p className="m-0 pt-0.5 font-serif text-[16px] leading-6" data-testid="course-next-step">
                <RichInline md={week.next.md} />
              </p>
            </>
          ) : (
            <p className="m-0 font-serif text-[15px] leading-6 italic text-muted">{t('course.noSteps')}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 pt-2">
          <Link to={`/course/${week.item.slug}`} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-text focus-ring">
            {t('course.openWeek')} <ChevronRightIcon size={16} />
          </Link>
          {after && <span className="text-[13px] leading-5 text-muted">{t('course.upNext', { title: after.item.title })}</span>}
        </div>
      </IndexCard>
    </section>
  )
}

const MARK: Record<WeekStatus, { glyph: string; tone: string }> = {
  done: { glyph: '✓', tone: 'text-ink-green' },
  current: { glyph: '●', tone: 'text-text' },
  missed: { glyph: '!', tone: 'text-amber-text' },
  upcoming: { glyph: '○', tone: 'text-faint' },
}

function StatusMark({ status }: { status: WeekStatus }) {
  const t = useT()
  const m = MARK[status]
  return (
    <span className={cn('flex w-5 shrink-0 justify-center text-[15px] font-semibold', m.tone)} role="img" aria-label={t(`course.status.${status}`)} data-status={status}>
      {m.glyph}
    </span>
  )
}

function Section({ label, children }: { label: TextKey; children: ReactNode }) {
  const t = useT()
  return (
    <section className="pt-6">
      <h2 className="px-6 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{t(label)}</h2>
      <HairlineList>{children}</HairlineList>
    </section>
  )
}

function Row({ item, selected, lead, meta = null }: { item: CourseListItem; selected: boolean; lead: ReactNode; meta?: string | null }) {
  return (
    <li>
      <Link
        to={`/course/${item.slug}`}
        aria-current={selected ? 'page' : undefined}
        className={cn(
          'flex min-h-14 items-center gap-3 px-6 py-2 transition-colors duration-fast hover:bg-surface-raised focus-ring-inset',
          selected && 'bg-surface-raised',
        )}
      >
        {lead}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-serif text-[17px] leading-6 font-semibold">{item.title}</span>
          {item.subtitle && <span className="truncate font-serif text-[15px] leading-6 italic text-muted">{item.subtitle}</span>}
        </span>
        {meta && <span className="shrink-0 text-[13px] tabular-nums text-muted">{meta}</span>}
        <ChevronRightIcon size={18} className="shrink-0 text-faint" />
      </Link>
    </li>
  )
}
