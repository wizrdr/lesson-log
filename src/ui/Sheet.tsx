import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function readDurationMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-normal')
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : 220
}

function useMounted(open: boolean): boolean {
  const [exiting, setExiting] = useState(false)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      setExiting(false)
      return
    }
    if (!wasOpen.current) return
    setExiting(true)
    const t = window.setTimeout(() => setExiting(false), readDurationMs())
    return () => window.clearTimeout(t)
  }, [open])
  return open || exiting
}

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const mounted = useMounted(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    document.body.classList.add('sheet-open')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    const first = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find((el) => !el.hasAttribute('data-sheet-close'))
    ;(first ?? panelRef.current)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('sheet-open')
      previous?.focus?.()
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center')}
      data-testid="sheet-root"
    >
      <div
        data-testid="sheet-backdrop"
        aria-hidden
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-overlay transition-opacity duration-normal ease-out',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex flex-col w-full max-h-[90dvh] bg-surface shadow-sheet outline-none',
          'rounded-t-lg md:rounded-lg md:max-w-[480px]',
          'transition-[transform,opacity] duration-normal ease-out',
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-4 md:opacity-0',
        )}
      >
        <div className="flex justify-center pt-2 pb-1 md:hidden" aria-hidden>
          <span className="block h-1.5 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-3 md:pt-5">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            type="button"
            aria-label="Закрыть"
            data-sheet-close
            onClick={onClose}
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-surface-raised active:bg-surface-raised"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        <div
          className={cn('px-5 pt-2', footer ? 'border-t border-border' : null)}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default Sheet
