import type { ReactNode } from 'react'
import { supabaseConfigured } from '@/lib/supabase'
import { LoginScreen } from './LoginScreen'
import { useSession } from './session'

function SetupNotice() {
  return (
    <main className="paper flex min-h-dvh items-center justify-center p-6 text-text">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="font-serif text-2xl font-semibold">Supabase не настроен</h1>
        <p className="text-sm text-muted">
          Не заданы переменные <code className="text-text">VITE_SUPABASE_URL</code> и{' '}
          <code className="text-text">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p className="text-sm text-muted">
          Скопируйте <code className="text-text">.env.example</code> в <code className="text-text">.env</code>, вставьте
          значения из проекта Supabase и перезапустите dev-сервер. Для сайта на GitHub Pages те же значения задаются как
          repo variables.
        </p>
      </div>
    </main>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (!supabaseConfigured) return <SetupNotice />
  if (loading) return <div className="min-h-dvh bg-bg" aria-busy />
  if (!session) return <LoginScreen />
  return <>{children}</>
}

export default AuthGate
