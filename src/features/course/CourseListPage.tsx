import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCourseItems, type CourseListItem } from '@/api/course'
import { Page } from '@/app/Page'
import { useErrorText, useT, type TextKey } from '@/i18n'
import { ChevronRightIcon, cn, HairlineList } from '@/ui'
import { currentWeek } from './weeks'

export interface CourseListPageProps {
  embedded?: boolean
  selectedSlug?: string
}

export function CourseListPage({ embedded = false, selectedSlug }: CourseListPageProps) {
  const t = useT()
  const errorText = useErrorText()
  const [items, setItems] = useState<CourseListItem[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    listCourseItems().then(setItems).catch(setError)
  }, [])

  const week = items ? currentWeek(items) : null
  const groups: { label: TextKey; list: CourseListItem[] }[] = items
    ? [
        { label: 'course.lessons', list: items.filter((i) => i.kind === 'lesson') },
        { label: 'course.reference', list: items.filter((i) => i.kind === 'reference') },
        { label: 'course.weeks', list: items.filter((i) => i.kind === 'week' && i.slug !== week?.slug) },
      ]
    : []

  return (
    <Page title={t('course.title')} width={embedded ? 'list' : 'page'}>
      {error !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}
      {items === null && error === null && <div className="h-24" aria-busy />}
      {items !== null && items.length === 0 && <p className="px-6 pt-6 font-serif leading-6 italic text-muted">{t('course.empty')}</p>}
      {week && <Group label="course.thisWeek" list={[week]} selectedSlug={selectedSlug} />}
      {groups.map((g) => g.list.length > 0 && <Group key={g.label} label={g.label} list={g.list} selectedSlug={selectedSlug} />)}
    </Page>
  )
}

function Group({ label, list, selectedSlug }: { label: TextKey; list: CourseListItem[]; selectedSlug?: string }) {
  const t = useT()
  return (
    <section className="pt-6">
      <h2 className="px-6 text-[11px] leading-6 font-semibold uppercase tracking-[0.12em] text-faint">{t(label)}</h2>
      <HairlineList>
        {list.map((item) => (
          <li key={item.id}>
            <Link
              to={`/course/${item.slug}`}
              aria-current={item.slug === selectedSlug ? 'page' : undefined}
              className={cn(
                'flex min-h-14 items-center gap-3 px-6 py-2 transition-colors duration-fast hover:bg-surface-raised focus-ring-inset',
                item.slug === selectedSlug && 'bg-surface-raised',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-serif text-[17px] leading-6 font-semibold">{item.title}</span>
                {item.subtitle && <span className="truncate font-serif text-[15px] leading-6 italic text-muted">{item.subtitle}</span>}
              </span>
              <ChevronRightIcon size={18} className="shrink-0 text-faint" />
            </Link>
          </li>
        ))}
      </HairlineList>
    </section>
  )
}
