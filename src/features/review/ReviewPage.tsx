import { Page } from '@/app/Page'
import { useT } from '@/i18n'

export function ReviewPage() {
  const t = useT()
  return (
    <Page title={t('tabs.review')}>
      <p className="px-6 pt-6 font-serif text-base italic text-muted">{t('review.empty')}</p>
    </Page>
  )
}
