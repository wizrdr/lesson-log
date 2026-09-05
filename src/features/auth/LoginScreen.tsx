import { useState, type FormEvent } from 'react'
import { Button, Field, Input } from '@/ui'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'
type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string }

function humanError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Неверный email или пароль.'
  if (/signups not allowed/i.test(message)) return 'Регистрация закрыта. Войдите с существующим паролем.'
  if (/already registered/i.test(message)) return 'Такой аккаунт уже есть. Войдите с паролем.'
  if (/password should be at least/i.test(message)) return 'Пароль короче 8 символов.'
  if (/rate limit/i.test(message)) return 'Слишком много попыток. Подождите минуту.'
  return message
}

export function LoginScreen() {
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
    if (error) setStatus({ kind: 'error', message: humanError(error.message) })
    else setStatus({ kind: 'idle' })
  }

  return (
    <main className="paper flex min-h-dvh items-center justify-center p-6 text-text">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-semibold leading-[1.05] tracking-[-0.01em]">Lesson Log</h1>
          <p className="font-serif text-base italic text-muted">{mode === 'signin' ? 'Вход' : 'Первый вход: создание аккаунта'}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Email">
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
          <Field label="Пароль" hint={mode === 'signup' ? 'Не короче 8 символов' : undefined}>
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
            {mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
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
            {mode === 'signin' ? 'Первый раз здесь? Создать аккаунт' : 'Уже есть аккаунт? Войти'}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default LoginScreen
