import { NavLink, Outlet } from 'react-router-dom'
import { cn, BeforeLessonIcon, JournalIcon, LessonsIcon, ReviewIcon, type IconProps } from '@/ui'
import type { ComponentType } from 'react'

const tabs: { to: string; label: string; Icon: ComponentType<IconProps> }[] = [
  { to: '/', label: 'Уроки', Icon: LessonsIcon },
  { to: '/journal', label: 'Журнал', Icon: JournalIcon },
  { to: '/review', label: 'Повторение', Icon: ReviewIcon },
  { to: '/before-lesson', label: 'Перед уроком', Icon: BeforeLessonIcon },
]

export function Shell() {
  return (
    <div className="flex h-dvh flex-col bg-bg text-text">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="paper min-h-full pt-[env(safe-area-inset-top)]">
          <Outlet />
        </div>
      </main>
      <nav className="grid grid-cols-4 border-t border-border bg-bg px-2 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)]">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex h-11 flex-col items-center justify-center gap-1 text-[11px]',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                isActive ? 'font-semibold text-text' : 'font-medium text-faint',
              )
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
