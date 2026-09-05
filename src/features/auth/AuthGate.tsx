import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import { supabaseConfigured } from '@/lib/supabase'
import { LoginScreen } from './LoginScreen'
import { useSession } from './session'

function SetupNotice() {
  const t = useT()
  return (
    <main className="paper flex min-h-dvh items-center justify-center p-6 text-text md:items-start md:pt-[15vh]">
      <div className="flex w-full max-w-sm flex-col gap-3 md:max-w-[420px]">
        <h1 className="font-serif text-2xl font-semibold">{t('setup.title')}</h1>
        <p className="text-sm text-muted">
          {t('setup.missing')} <code className="text-text">VITE_SUPABASE_URL</code>,{' '}
          <code className="text-text">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p className="text-sm text-muted">{t('setup.howTo', { example: '.env.example', env: '.env' })}</p>
      </div>
    </main>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (!supabaseConfigured) return <SetupNotice />
  if (loading) return <div className="paper min-h-dvh" aria-busy />
  if (!session) return <LoginScreen />
  return <>{children}</>
}

export default AuthGate
