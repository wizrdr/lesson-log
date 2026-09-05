type Listener = (e: MediaQueryListEvent) => void

export interface MatchMediaMock {
  set(width: number): void
  restore(): void
}

function minWidth(query: string): number {
  const m = /min-width:\s*(\d+)px/.exec(query)
  return m ? Number(m[1]) : 0
}

export function mockMatchMedia(width: number): MatchMediaMock {
  const original = window.matchMedia
  const listeners = new Map<string, Set<Listener>>()
  let current = width
  window.matchMedia = (query: string) => {
    const set = listeners.get(query) ?? new Set<Listener>()
    listeners.set(query, set)
    return {
      media: query,
      get matches() {
        return current >= minWidth(query)
      },
      onchange: null,
      addEventListener: (_: string, l: Listener) => void set.add(l),
      removeEventListener: (_: string, l: Listener) => void set.delete(l),
      addListener: (l: Listener) => void set.add(l),
      removeListener: (l: Listener) => void set.delete(l),
      dispatchEvent: () => true,
    } as MediaQueryList
  }
  return {
    set(next) {
      current = next
      for (const [query, set] of listeners) {
        const matches = current >= minWidth(query)
        for (const l of set) l({ matches, media: query } as MediaQueryListEvent)
      }
    },
    restore() {
      window.matchMedia = original
    },
  }
}
