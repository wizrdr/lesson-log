import { useLayoutEffect, type RefObject } from 'react'

function px(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string, minRows = 1, maxRows = 4): void {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const style = getComputedStyle(el)
    const line = px(style.lineHeight) || px(style.fontSize) * 1.5
    if (!line) return
    const padding = px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth)
    el.rows = minRows
    const needed = Math.ceil((el.scrollHeight - padding) / line)
    el.rows = Math.min(maxRows, Math.max(minRows, needed))
  }, [ref, value, minRows, maxRows])
}

export default useAutoGrow
