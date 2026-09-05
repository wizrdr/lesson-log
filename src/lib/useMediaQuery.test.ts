import { act, renderHook } from '@testing-library/react'
import { mockMatchMedia, type MatchMediaMock } from '@/test/matchMedia'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  let mm: MatchMediaMock | null = null
  afterEach(() => {
    mm?.restore()
    mm = null
  })

  it('returns false when matchMedia is unavailable (jsdom)', () => {
    expect(window.matchMedia).toBeUndefined()
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)
  })

  it('reflects the initial match and reacts to change events', () => {
    mm = mockMatchMedia(1440)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(true)

    act(() => mm!.set(390))
    expect(result.current).toBe(false)

    act(() => mm!.set(1200))
    expect(result.current).toBe(true)
  })

  it('unsubscribes on unmount', () => {
    mm = mockMatchMedia(1440)
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(true)
    unmount()
    expect(() => mm!.set(390)).not.toThrow()
  })
})
