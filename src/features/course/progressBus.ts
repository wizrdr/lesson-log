import { useSyncExternalStore } from 'react'

// The list and the open item are separate components on desktop; saves bump this so the list refetches.
let version = 0
const listeners = new Set<() => void>()

export function notifyProgressSaved(): void {
  version++
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProgressVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0)
}
