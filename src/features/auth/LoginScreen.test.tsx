import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const signInWithPassword = vi.fn()
const signUp = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
    },
  },
  supabaseConfigured: true,
}))

import { LoginScreen } from './LoginScreen'

const email = () => screen.getByPlaceholderText('you@example.com')
const password = () => document.querySelector<HTMLInputElement>('input[name=password]')!
const form = () => password().closest('form')!

describe('LoginScreen', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    signUp.mockReset()
  })

  it('signs in with trimmed email and password', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<LoginScreen />)
    fireEvent.change(email(), { target: { value: ' me@example.com ' } })
    fireEvent.change(password(), { target: { value: 'secret123' } })
    fireEvent.submit(form())
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'secret123' }))
    expect(signUp).not.toHaveBeenCalled()
  })

  it('shows a readable error for wrong credentials', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginScreen />)
    fireEvent.change(email(), { target: { value: 'x@example.com' } })
    fireEvent.change(password(), { target: { value: 'wrongpass' } })
    fireEvent.submit(form())
    await waitFor(() => expect(screen.getByText('Неверный email или пароль.')).toBeInTheDocument())
    expect(password()).toHaveAttribute('aria-invalid', 'true')
  })

  it('switches to signup mode and calls signUp', async () => {
    signUp.mockResolvedValue({ error: null })
    render(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Создать аккаунт$/ }))
    fireEvent.change(email(), { target: { value: 'new@example.com' } })
    fireEvent.change(password(), { target: { value: 'longenough' } })
    fireEvent.submit(form())
    await waitFor(() => expect(signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'longenough' }))
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})
