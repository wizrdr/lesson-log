import { useMemo, useSyncExternalStore } from 'react'

function query(q: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(q) : null
}

export function useMediaQuery(q: string): boolean {
  const store = useMemo(
    () => ({
      subscribe: (onChange: () => void) => {
        const mql = query(q)
        if (!mql) return () => {}
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
      },
      getSnapshot: () => query(q)?.matches ?? false,
    }),
    [q],
  )
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false)
}

export default useMediaQuery
