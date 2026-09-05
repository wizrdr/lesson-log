import { Page } from '@/app/Page'
import { useT } from '@/i18n'

export function JournalPage() {
  const t = useT()
  return (
    <Page title={t('tabs.journal')}>
      <p className="px-6 pt-6 font-serif text-base italic text-muted">{t('journal.empty')}</p>
    </Page>
  )
}
