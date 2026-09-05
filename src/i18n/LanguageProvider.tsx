import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { getLang, subscribe } from './store'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getLang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return <>{children}</>
}
