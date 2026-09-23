import { useSyncExternalStore } from 'react'

const KEY = 'll.courseFocus'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let current = read()

export function setCourseFocus(on: boolean): void {
  current = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // private mode: keep the in-memory value only
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCourseFocus(): boolean {
  return useSyncExternalStore(subscribe, () => current, () => false)
}
