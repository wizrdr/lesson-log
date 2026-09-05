import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        db: { schema: 'lesson_log' },
        auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null

export const supabaseConfigured = supabase !== null
