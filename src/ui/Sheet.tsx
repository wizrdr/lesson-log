import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/i18n'
import { cn } from './cn'
import { CloseIcon } from './icons'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE = ['a[href]', 'button', 'input', 'textarea', 'select', '[tabindex]']
  .map((s) => `${s}:not([disabled]):not([tabindex="-1"])`)
  .join(', ')

function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

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
  const t = useT()
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
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement as HTMLElement | null
    document.body.classList.add('sheet-open')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables(panel)
      if (list.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    if (!panel.contains(document.activeElement)) {
      const first = focusables(panel).find((el) => !el.hasAttribute('data-sheet-close'))
      ;(first ?? panel).focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('sheet-open')
      previous?.focus?.()
      if (navigator.maxTouchPoints > 0 && window.scrollY > 0) window.scrollTo(0, 0)
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
          'relative flex w-full flex-col bg-surface shadow-sheet outline-none',
          'max-h-[calc(100dvh-env(safe-area-inset-top,0px)-1.5rem)] md:max-h-[calc(100dvh-4rem)]',
          'rounded-t-lg md:rounded-lg md:max-w-[480px]',
          'transition-[transform,opacity] duration-normal ease-out',
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-4 md:opacity-0',
        )}
      >
        <div className="flex shrink-0 justify-center pt-2 pb-1 md:hidden" aria-hidden>
          <span className="block h-1.5 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-2 pb-3 md:pt-5">
          <h2 className="font-serif text-xl leading-7 font-semibold text-text">{title}</h2>
          <button
            type="button"
            aria-label={t('sheet.close')}
            data-sheet-close
            onClick={onClose}
            className="-mr-3 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-surface-raised active:bg-surface-raised"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div
          className={cn('min-h-0 flex-1 overflow-y-auto px-6', footer ? 'pb-6' : 'pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]')}
        >
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t border-border px-6 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default Sheet
