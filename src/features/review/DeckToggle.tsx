import { useState } from 'react'
import { addToDeck, removeFromDeck } from '@/api/cards'
import { useT } from '@/i18n'
import { CheckIcon, cn, PlusIcon } from '@/ui'

export interface DeckToggleProps {
  entryId: string
  inDeck: boolean
  onChange: (inDeck: boolean) => void
  onError: (e: unknown) => void
  className?: string
}

export function DeckToggle({ entryId, inDeck, onChange, onError, className }: DeckToggleProps) {
  const t = useT()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !inDeck
    setBusy(true)
    onChange(next)
    try {
      await (next ? addToDeck(entryId) : removeFromDeck(entryId))
    } catch (e) {
      onChange(inDeck)
      onError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={inDeck ? t('deck.remove') : t('deck.add')}
      title={inDeck ? t('deck.remove') : t('deck.add')}
      aria-pressed={inDeck}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap select-none transition-colors focus-ring disabled:opacity-60',
        inDeck ? 'bg-ink text-ink-fg' : 'border border-border-strong text-muted hover:border-ink hover:text-text',
        className,
      )}
    >
      {inDeck ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
      <span>{inDeck ? t('deck.inDeck') : t('deck.addShort')}</span>
    </button>
  )
}
