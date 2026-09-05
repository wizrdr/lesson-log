import { useParams } from 'react-router-dom'
import { MQ_DESKTOP } from '@/app/breakpoints'
import { useT } from '@/i18n'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/ui'
import { LessonPage } from './LessonPage'
import { LessonsPage } from './LessonsPage'

export function LessonsLayout() {
  const { id } = useParams()
  const desktop = useMediaQuery(MQ_DESKTOP)
  const showList = desktop || !id
  const showLesson = desktop || Boolean(id)

  return (
    <div className={cn('flex', desktop ? 'h-[calc(100dvh-env(safe-area-inset-top))] flex-none min-h-0' : 'flex-1 flex-col')}>
      {showList && (
        <aside
          data-testid="lessons-list"
          className={cn('flex flex-col', desktop ? 'w-[340px] shrink-0 overflow-y-auto border-r border-border' : 'flex-1')}
        >
          <div className="paper flex flex-1 flex-col">
            <LessonsPage embedded={desktop} selectedId={id} />
          </div>
        </aside>
      )}
      {showLesson && (
        <section data-testid="lesson-panel" className={cn('flex min-w-0 flex-1 flex-col', desktop && 'overflow-y-auto')}>
          <div className={cn('paper flex flex-1 flex-col', desktop && 'px-8')}>
            {id ? <LessonPage key={id} embedded={desktop} /> : <Placeholder />}
          </div>
        </section>
      )}
    </div>
  )
}

function Placeholder() {
  const t = useT()
  return <p className="flex min-h-11 items-center pt-6 font-serif text-lg leading-6 italic text-muted">{t('lessons.pickOne')}</p>
}
