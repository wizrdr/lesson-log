import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function client(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase не настроен')
  return supabase
}

export async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getSession()
  if (error) throw new Error(error.message)
  const id = data.session?.user.id
  if (!id) throw new Error('Нужно войти в аккаунт')
  return id
}

export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${what}: пустой ответ`)
  return result.data
}

export function check(result: { error: { message: string } | null }, what: string): void {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
}

export async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error
    } catch {}
  }
  return error instanceof Error ? error.message : String(error)
}
