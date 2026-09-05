import { NavLink, Outlet } from 'react-router-dom'
import { useLocale, useT, type TextKey } from '@/i18n'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn, BeforeLessonIcon, GlobeIcon, JournalIcon, LessonsIcon, ReviewIcon, type IconProps } from '@/ui'
import type { ComponentType } from 'react'
import { MQ_LAPTOP, MQ_TABLET } from './breakpoints'

const tabs: { to: string; label: TextKey; Icon: ComponentType<IconProps> }[] = [
  { to: '/', label: 'tabs.lessons', Icon: LessonsIcon },
  { to: '/journal', label: 'tabs.journal', Icon: JournalIcon },
  { to: '/review', label: 'tabs.review', Icon: ReviewIcon },
  { to: '/before-lesson', label: 'tabs.beforeLesson', Icon: BeforeLessonIcon },
]

export function Shell() {
  const tablet = useMediaQuery(MQ_TABLET)
  const labels = useMediaQuery(MQ_LAPTOP)
  return (
    <div className={cn('flex h-dvh bg-bg pt-[env(safe-area-inset-top)] text-text', tablet ? 'flex-row' : 'flex-col')}>
      {tablet && <SideNav labels={labels} />}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="paper flex min-h-full flex-col">
          <Outlet />
        </div>
      </main>
      {!tablet && <TabBar />}
    </div>
  )
}

function SideNav({ labels }: { labels: boolean }) {
  const t = useT()
  const { lang, setLang } = useLocale()
  return (
    <nav
      data-testid="side-nav"
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-bg',
        labels ? 'w-[220px]' : 'w-[72px]',
      )}
    >
      {labels && <div className="px-5 pt-6 pb-4 font-serif text-xl font-semibold tracking-[-0.01em]">Lesson Log</div>}
      <ul className={cn('m-0 flex list-none flex-col p-0', labels ? null : 'pt-4')}>
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              aria-label={t(label)}
              title={labels ? undefined : t(label)}
              className={({ isActive }) =>
                cn(
                  'relative flex h-11 items-center gap-3 text-[15px] transition-colors duration-fast hover:bg-surface-raised focus-ring-inset',
                  labels ? 'px-5' : 'justify-center',
                  isActive
                    ? 'font-semibold text-text before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-ink'
                    : 'font-medium text-muted',
                )
              }
            >
              <Icon />
              {labels && <span>{t(label)}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-label={t('lang.other')}
        title={labels ? undefined : t('lang.other')}
        onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        className={cn(
          'mt-auto mb-[max(env(safe-area-inset-bottom),12px)] flex h-11 items-center gap-3 text-[15px] font-medium text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text focus-ring-inset',
          labels ? 'px-5' : 'justify-center',
        )}
      >
        <GlobeIcon />
        {labels && <span>{t('lang.other')}</span>}
      </button>
    </nav>
  )
}

function TabBar() {
  const t = useT()
  return (
    <nav
      data-testid="tab-bar"
      className="grid grid-cols-4 border-t border-border bg-bg px-2 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)]"
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              'flex h-11 flex-col items-center justify-center gap-1 text-[11px] focus-ring-inset',
              isActive ? 'font-semibold text-text' : 'font-medium text-faint',
            )
          }
        >
          <Icon />
          <span>{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
