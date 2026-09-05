import { Page } from '@/app/Page'
import { useT } from '@/i18n'

export function BeforeLessonPage() {
  const t = useT()
  return (
    <Page title={t('tabs.beforeLesson')}>
      <p className="px-6 pt-6 font-serif text-base italic text-muted">{t('beforeLesson.empty')}</p>
    </Page>
  )
}
