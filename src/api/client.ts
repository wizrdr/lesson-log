import { FunctionsHttpError } from '@supabase/supabase-js'
import type { ApiErrorCode } from '@/i18n/types'
import { supabase } from '@/lib/supabase'

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'ApiError'
  }
}

export function client(): NonNullable<typeof supabase> {
  if (!supabase) throw new ApiError('notConfigured')
  return supabase
}

export async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getSession()
  if (error) throw new ApiError('signedOut', error.message)
  const id = data.session?.user.id
  if (!id) throw new ApiError('signedOut')
  return id
}

export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, code: ApiErrorCode): T {
  if (result.error) throw new ApiError(code, result.error.message)
  if (result.data === null) throw new ApiError(code)
  return result.data
}

export function check(result: { error: { message: string } | null }, code: ApiErrorCode): void {
  if (result.error) throw new ApiError(code, result.error.message)
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
