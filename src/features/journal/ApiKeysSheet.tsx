import { useEffect, useState } from 'react'
import { API_KEY_PREFIX, createApiKey, listApiKeys, revokeApiKey } from '@/api/apiKeys'
import type { ApiKey } from '@/api/types'
import { formatLessonDate } from '@/features/lessons/format'
import { useErrorText, useLocale, useT } from '@/i18n'
import { Button, Field, HairlineList, Input, Sheet } from '@/ui'

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/ll-cards`
const COPIED_MS = 2000

export interface ApiKeysSheetProps {
  open: boolean
  onClose: () => void
}

function curlExample(): string {
  return [
    `curl -X POST '${ENDPOINT}' \\`,
    `  -H 'Authorization: Bearer ${API_KEY_PREFIX}...' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"cards":[{"type":"vocab","original":"zeszyt","corrected":"тетрадь","lang":"pl"}]}'`,
  ].join('\n')
}

function useCopy(): [copied: string | null, copy: (id: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (copied === null) return
    const timer = window.setTimeout(() => setCopied(null), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [copied])
  const copy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(id)
  }
  return [copied, copy]
}

export function ApiKeysSheet({ open, onClose }: ApiKeysSheetProps) {
  const t = useT()
  const { lang } = useLocale()
  const errorText = useErrorText()
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [fresh, setFresh] = useState<{ key: string; row: ApiKey } | null>(null)
  const [copied, copy] = useCopy()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    listApiKeys()
      .then((rows) => {
        if (cancelled) return
        setKeys(rows)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function create() {
    if (busy || label.trim() === '') return
    setBusy('create')
    setError(null)
    try {
      const created = await createApiKey(label)
      setKeys((list) => [created.row, ...(list ?? [])])
      setFresh(created)
      setLabel('')
      setCreating(false)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  async function revoke(id: string) {
    if (busy) return
    setBusy(id)
    setError(null)
    try {
      await revokeApiKey(id)
      setKeys((list) => list?.filter((k) => k.id !== id) ?? list)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  const example = curlExample()

  return (
    <Sheet open={open} onClose={onClose} title={t('apiKeys.title')}>
      <div className="flex flex-col gap-5">
        <p className="text-[13px] leading-5 text-muted">{t('apiKeys.intro')}</p>

        {error !== null && <p className="text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}

        {fresh && (
          <section aria-label={t('apiKeys.newKey')} className="flex flex-col gap-3 rounded-md border border-border-strong p-4">
            <span className="text-[13px] leading-5 font-medium text-muted">
              {t('apiKeys.newKey')} · {fresh.row.label}
            </span>
            <code className="block rounded-md bg-surface-raised px-3 py-2 font-mono text-[13px] leading-5 wrap-anywhere">{fresh.key}</code>
            <p className="text-[13px] leading-5 text-pen-red">{t('apiKeys.showOnce')}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copy('fresh', fresh.key)}>
                {copied === 'fresh' ? t('apiKeys.copied') : t('apiKeys.copy')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setFresh(null)}>
                {t('apiKeys.done')}
              </Button>
            </div>
          </section>
        )}

        {keys === null && error === null && <div className="h-12" aria-busy />}

        {keys?.length === 0 && <p className="font-serif text-base leading-6 italic text-muted">{t('apiKeys.empty')}</p>}

        {keys && keys.length > 0 && (
          <HairlineList className="-mx-6">
            {keys.map((k) => (
              <li key={k.id} className="flex items-start gap-3 px-6 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium wrap-anywhere">{k.label}</span>
                  <span className="font-mono text-[13px] leading-5 text-muted">
                    {API_KEY_PREFIX}
                    {k.key_prefix}…
                  </span>
                  <span className="text-[12px] leading-5 text-faint">
                    {t('apiKeys.created', { date: formatLessonDate(k.created_at, lang) })} ·{' '}
                    {k.last_used_at ? t('apiKeys.lastUsed', { date: formatLessonDate(k.last_used_at, lang) }) : t('apiKeys.neverUsed')}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="-my-1.5 shrink-0" loading={busy === k.id} disabled={busy !== null} onClick={() => void revoke(k.id)}>
                  {t('apiKeys.revoke')}
                </Button>
              </li>
            ))}
          </HairlineList>
        )}

        {creating ? (
          <Field label={t('apiKeys.label')}>
            <Input
              aria-label={t('apiKeys.label')}
              autoFocus
              placeholder={t('apiKeys.labelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create()
              }}
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" disabled={label.trim() === ''} loading={busy === 'create'} onClick={() => void create()}>
                {t('apiKeys.confirmCreate')}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setCreating(false)}>
                {t('apiKeys.cancel')}
              </Button>
            </div>
          </Field>
        ) : (
          <Button variant="secondary" full disabled={busy !== null} onClick={() => setCreating(true)}>
            {t('apiKeys.create')}
          </Button>
        )}

        <details className="text-[13px] leading-5">
          <summary className="cursor-pointer select-none font-medium text-muted">{t('apiKeys.howTo')}</summary>
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-muted">{t('apiKeys.howToText')}</p>
            <pre className="overflow-x-auto rounded-md bg-surface-raised px-3 py-2 font-mono text-[12px] leading-5">{example}</pre>
            <Button size="sm" variant="secondary" className="self-start" onClick={() => copy('curl', example)}>
              {copied === 'curl' ? t('apiKeys.copied') : t('apiKeys.copy')}
            </Button>
          </div>
        </details>
      </div>
    </Sheet>
  )
}
