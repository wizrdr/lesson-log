import { Card } from '@/ui'
import { Page } from '@/app/Page'

export function BeforeLessonPage() {
  return (
    <Page title="Перед уроком">
      <Card>
        <p className="text-sm text-muted">Открытые ошибки и карточки к ближайшему уроку появятся здесь.</p>
      </Card>
    </Page>
  )
}
