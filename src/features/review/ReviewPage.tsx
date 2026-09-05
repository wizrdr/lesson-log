import { Card } from '@/ui'
import { Page } from '@/app/Page'

export function ReviewPage() {
  return (
    <Page title="Повторение">
      <Card>
        <p className="text-sm text-muted">Карточки на сегодня появятся здесь.</p>
      </Card>
    </Page>
  )
}
