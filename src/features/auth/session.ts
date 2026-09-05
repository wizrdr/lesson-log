import { useSyncExternalStore } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface SessionState {
  session: Session | null
  loading: boolean
}

let state: SessionState = { session: null, loading: supabase !== null }
const listeners = new Set<() => void>()

function setState(next: SessionState): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }))
  supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }))
}

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const s = useSyncExternalStore(subscribe, () => state)
  return { session: s.session, user: s.session?.user ?? null, loading: s.loading }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
  setState({ session: null, loading: false })
}
