import { Card } from '@/ui'
import { Page } from '@/app/Page'

export function JournalPage() {
  return (
    <Page title="Журнал">
      <Card>
        <p className="text-sm text-muted">Здесь будут все исправления, слова и правила из уроков.</p>
      </Card>
    </Page>
  )
}
