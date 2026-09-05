import { useState } from 'react'
import { addToDeck, removeFromDeck } from '@/api/cards'
import { useT } from '@/i18n'
import { cn, IconButton, ReviewFilledIcon, ReviewIcon } from '@/ui'

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
    <IconButton
      label={inDeck ? t('deck.remove') : t('deck.add')}
      aria-pressed={inDeck}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(inDeck ? 'text-ink' : 'text-faint', className)}
    >
      {inDeck ? <ReviewFilledIcon /> : <ReviewIcon />}
    </IconButton>
  )
}
