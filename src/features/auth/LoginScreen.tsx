import { useState, type FormEvent } from 'react'
import { isLang, useLocale, useT, type TextKey } from '@/i18n'
import { Button, Field, Input, Segmented } from '@/ui'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'
type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string }

const LANG_OPTIONS = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
]

const AUTH_ERRORS: [RegExp, TextKey][] = [
  [/invalid login credentials/i, 'auth.invalidCredentials'],
  [/signups not allowed/i, 'auth.signupsClosed'],
  [/already registered/i, 'auth.alreadyRegistered'],
  [/password should be at least/i, 'auth.shortPassword'],
  [/rate limit/i, 'auth.rateLimit'],
]

function authErrorKey(message: string): TextKey | null {
  return AUTH_ERRORS.find(([re]) => re.test(message))?.[1] ?? null
}

export function LoginScreen() {
  const t = useT()
  const { lang, setLang } = useLocale()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    setStatus({ kind: 'busy' })
    const creds = { email: email.trim(), password }
    const { error } =
      mode === 'signin' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds)
    if (error) {
      const key = authErrorKey(error.message)
      setStatus({ kind: 'error', message: key ? t(key) : error.message })
    } else setStatus({ kind: 'idle' })
  }

  return (
    <main className="paper flex min-h-dvh items-center justify-center p-6 text-text">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-start gap-1.5">
          <h1 className="font-serif text-[34px] font-semibold leading-[1.05] tracking-[-0.01em]">Lesson Log</h1>
          <p className="font-serif text-base italic text-muted">{mode === 'signin' ? t('login.signin') : t('login.signup')}</p>
          <Segmented
            className="mt-2"
            options={LANG_OPTIONS}
            value={lang}
            onChange={(v) => {
              if (isLang(v)) setLang(v)
            }}
          />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('login.email')}>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('login.password')} hint={mode === 'signup' ? t('login.passwordHint') : undefined}>
            <Input
              type="password"
              name="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              invalid={status.kind === 'error'}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {status.kind === 'error' && <p className="text-[13px] text-pen-red">{status.message}</p>}
          <Button type="submit" full loading={status.kind === 'busy'}>
            {mode === 'signin' ? t('login.submitSignin') : t('login.submitSignup')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setStatus({ kind: 'idle' })
            }}
          >
            {mode === 'signin' ? t('login.toSignup') : t('login.toSignin')}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default LoginScreen
