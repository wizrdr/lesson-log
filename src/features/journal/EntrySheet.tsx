import { useState } from 'react'
import { createManualEntry, softDeleteEntry, updateEntry, type EntryInput, type JournalEntry } from '@/api/entries'
import type { Entry, EntryType } from '@/api/types'
import { useErrorText, useT } from '@/i18n'
import { Button, Field, Segmented, Sheet, Textarea } from '@/ui'

const TYPES: EntryType[] = ['correction', 'vocab', 'rule']

export interface EntrySheetProps {
  open: boolean
  entry: Entry | null
  onClose: () => void
  onCreated: (entry: JournalEntry) => void
  onUpdated: (entry: Entry) => void
  onDeleted: (id: string) => void
}

export function EntrySheet({ open, entry, onClose, onCreated, onUpdated, onDeleted }: EntrySheetProps) {
  const t = useT()
  const errorText = useErrorText()
  const [type, setType] = useState<EntryType>(entry?.type ?? 'vocab')
  const [original, setOriginal] = useState(entry?.original ?? '')
  const [corrected, setCorrected] = useState(entry?.corrected ?? '')
  const [explanation, setExplanation] = useState(entry?.explanation ?? '')
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<unknown>(null)

  const editing = entry !== null
  const canSubmit = busy === null && original.trim() !== ''

  async function submit() {
    if (!canSubmit) return
    const input: EntryInput = { type, original, corrected, explanation }
    setBusy('save')
    setError(null)
    try {
      if (entry) onUpdated(await updateEntry(entry.id, input))
      else onCreated(await createManualEntry(input))
      onClose()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!entry || busy) return
    setBusy('delete')
    setError(null)
    try {
      await softDeleteEntry(entry.id)
      onDeleted(entry.id)
      onClose()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('entry.editTitle') : t('entry.newTitle')}
      footer={
        <div className="flex flex-col gap-2">
          {error !== null && <p className="text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}
          <Button full disabled={!canSubmit} loading={busy === 'save'} onClick={() => void submit()}>
            {editing ? t('entry.save') : t('entry.create')}
          </Button>
          {editing && (
            <Button full variant="danger" disabled={busy !== null} loading={busy === 'delete'} onClick={() => void remove()}>
              {t('entry.delete')}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('entry.type')}>
          <Segmented
            options={TYPES.map((value) => ({ value, label: t(`type.${value}`) }))}
            value={type}
            onChange={(v) => setType(v as EntryType)}
          />
        </Field>
        <Field label={t('entry.original')}>
          <Textarea aria-label={t('entry.original')} autoGrow autoFocus value={original} onChange={(e) => setOriginal(e.target.value)} />
        </Field>
        <Field label={t('entry.corrected')}>
          <Textarea aria-label={t('entry.corrected')} autoGrow value={corrected} onChange={(e) => setCorrected(e.target.value)} />
        </Field>
        <Field label={t('entry.explanation')} hint={t('entry.explanationHint')}>
          <Textarea aria-label={t('entry.explanation')} rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
