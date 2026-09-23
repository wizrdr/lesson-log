import { useParams } from 'react-router-dom'
import { MQ_DESKTOP, MQ_TABLET } from '@/app/breakpoints'
import { useT } from '@/i18n'
import { setCourseFocus, useCourseFocus } from '@/lib/focusMode'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn, IconButton, PanelLeftIcon } from '@/ui'
import { CourseItemPage } from './CourseItemPage'
import { CourseListPage } from './CourseListPage'

export function CourseLayout() {
  const { slug } = useParams()
  const desktop = useMediaQuery(MQ_DESKTOP)
  const tablet = useMediaQuery(MQ_TABLET)
  const focus = useCourseFocus() && Boolean(slug)
  const showList = (desktop && !focus) || !slug
  const showItem = desktop || Boolean(slug)

  return (
    <div className={cn('flex', desktop ? 'h-[calc(100dvh-env(safe-area-inset-top))] flex-none min-h-0' : 'flex-1 flex-col')}>
      {showList && (
        <aside data-testid="course-list" className={cn('flex flex-col', desktop ? 'w-[340px] shrink-0 overflow-y-auto border-r border-border' : 'flex-1')}>
          <div className="paper flex flex-1 flex-col">
            <CourseListPage embedded={desktop} selectedSlug={slug} />
          </div>
        </aside>
      )}
      {showItem && (
        <section data-testid="course-panel" className={cn('flex min-w-0 flex-1 flex-col', desktop && 'overflow-y-auto')}>
          <div className={cn('paper flex flex-1 flex-col', desktop && 'px-8')}>
            {slug ? <CourseItemPage key={slug} embedded={desktop && !focus} action={tablet ? <FocusToggle on={focus} /> : undefined} /> : <Placeholder />}
          </div>
        </section>
      )}
    </div>
  )
}

function FocusToggle({ on }: { on: boolean }) {
  const t = useT()
  return (
    <IconButton label={t(on ? 'course.focusOff' : 'course.focusOn')} aria-pressed={on} onClick={() => setCourseFocus(!on)}>
      <PanelLeftIcon />
    </IconButton>
  )
}

function Placeholder() {
  const t = useT()
  return <p className="flex min-h-11 items-center pt-6 font-serif text-lg leading-6 italic text-muted">{t('course.pickOne')}</p>
}
