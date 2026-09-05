import { useParams } from 'react-router-dom'
import { MQ_DESKTOP } from '@/app/breakpoints'
import { useT } from '@/i18n'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { LessonPage } from './LessonPage'
import { LessonsPage } from './LessonsPage'

export function LessonsLayout() {
  const { id } = useParams()
  const desktop = useMediaQuery(MQ_DESKTOP)

  if (!desktop) return id ? <LessonPage key={id} /> : <LessonsPage />

  return (
    <div className="flex min-h-dvh">
      <aside className="w-[380px] shrink-0 border-r border-border">
        <LessonsPage embedded selectedId={id} />
      </aside>
      <section className="min-w-0 flex-1 px-4">
        {id ? <LessonPage key={id} embedded /> : <Placeholder />}
      </section>
    </div>
  )
}

function Placeholder() {
  const t = useT()
  return <p className="px-6 pt-16 font-serif text-lg italic text-muted">{t('lessons.pickOne')}</p>
}
