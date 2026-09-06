import { useEffect, useMemo, useState } from 'react'
import { listEntries, type JournalEntry } from '@/api/entries'
import type { Entry, EntryType } from '@/api/types'
import { Page } from '@/app/Page'
import { formatLessonDate } from '@/features/lessons/format'
import { DeckToggle } from '@/features/review/DeckToggle'
import { useErrorText, useLocale, useT, type Lang, type TextKey } from '@/i18n'
import { Button, HairlineList, IconButton, Input, KeyIcon, PlusIcon, Segmented } from '@/ui'
import { ApiKeysSheet } from './ApiKeysSheet'
import { EntrySheet } from './EntrySheet'

const ALL = 'all'
const TYPE_FILTERS: { value: EntryType | typeof ALL; label: TextKey }[] = [
  { value: ALL, label: 'journal.all' },
  { value: 'correction', label: 'journal.filterCorrection' },
  { value: 'vocab', label: 'journal.filterVocab' },
  { value: 'rule', label: 'journal.filterRule' },
]
const SEARCH_DEBOUNCE_MS = 250

interface Group {
  key: string
  title: string
  items: JournalEntry[]
}

function groupByLesson(entries: JournalEntry[], manualTitle: string, lang: Lang): Group[] {
  const groups = new Map<string, Group>()
  for (const e of entries) {
    const key = e.lesson?.id ?? 'manual'
    let group = groups.get(key)
    if (!group) {
      const title = e.lesson ? [formatLessonDate(e.lesson.date, lang), e.lesson.tutor?.name].filter(Boolean).join(' · ') : manualTitle
      group = { key, title, items: [] }
      groups.set(key, group)
    }
    group.items.push(e)
  }
  const list = [...groups.values()]
  const manual = list.find((g) => g.key === 'manual')
  const lessons = list.filter((g) => g.key !== 'manual').sort((a, b) => b.items[0].lesson!.date.localeCompare(a.items[0].lesson!.date))
  return manual ? [manual, ...lessons] : lessons
}

export function JournalPage() {
  const t = useT()
  const { lang } = useLocale()
  const errorText = useErrorText()
  const [type, setType] = useState<EntryType | typeof ALL>(ALL)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<JournalEntry[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetKey, setSheetKey] = useState(0)
  const [keysOpen, setKeysOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    listEntries({ type: type === ALL ? undefined : type, search: query || undefined })
      .then((rows) => {
        if (cancelled) return
        setEntries(rows)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })
    return () => {
      cancelled = true
    }
  }, [type, query])

  const groups = useMemo(() => (entries ? groupByLesson(entries, t('journal.manual'), lang) : []), [entries, t, lang])
  const filtered = type !== ALL || query !== ''

  function patch(id: string, change: Partial<JournalEntry>) {
    setEntries((list) => list?.map((e) => (e.id === id ? { ...e, ...change } : e)) ?? list)
  }

  function openSheet(entry: Entry | null) {
    setEditing(entry)
    setSheetKey((k) => k + 1)
    setSheetOpen(true)
  }

  return (
    <Page
      title={t('tabs.journal')}
      subtitle={t('journal.subtitle')}
      action={
        <div className="flex items-center gap-1">
          <IconButton label={t('apiKeys.open')} onClick={() => setKeysOpen(true)}>
            <KeyIcon />
          </IconButton>
          <Button variant="secondary" size="sm" aria-label={t('journal.add')} onClick={() => openSheet(null)}>
            <PlusIcon size={18} />
            <span className="sm:hidden">{t('journal.addShort')}</span>
            <span className="hidden sm:inline">{t('journal.add')}</span>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-6 pt-6">
        <Segmented
          options={TYPE_FILTERS.map(({ value, label }) => ({ value, label: t(label) }))}
          value={type}
          onChange={(v) => setType(v as EntryType | typeof ALL)}
        />
        <Input
          type="search"
          aria-label={t('journal.search')}
          placeholder={t('journal.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error !== null && <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(error)}</p>}

      {entries === null && error === null && <div className="h-24" aria-busy />}

      {entries?.length === 0 && (
        <p className="px-6 pt-6 font-serif text-base leading-6 italic text-muted">{filtered ? t('journal.noMatches') : t('journal.empty')}</p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="pt-6" aria-label={group.title}>
          <h2 className="px-6 font-serif text-base leading-6 italic text-muted">{group.title}</h2>
          <HairlineList>
            {group.items.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 pl-6 pr-3 py-3">
                <button type="button" onClick={() => openSheet(entry)} className="min-w-0 flex-1 text-left focus-ring-inset">
                  <EntryRow entry={entry} />
                </button>
                <DeckToggle
                  entryId={entry.id}
                  inDeck={entry.inDeck}
                  onChange={(inDeck) => patch(entry.id, { inDeck })}
                  onError={setError}
                  className="-my-1"
                />
              </li>
            ))}
          </HairlineList>
        </section>
      ))}

      <EntrySheet
        key={sheetKey}
        open={sheetOpen}
        entry={editing}
        onClose={() => setSheetOpen(false)}
        onCreated={(entry) => setEntries((list) => [entry, ...(list ?? [])])}
        onUpdated={(entry) => patch(entry.id, entry)}
        onDeleted={(id) => setEntries((list) => list?.filter((e) => e.id !== id) ?? list)}
      />
      <ApiKeysSheet open={keysOpen} onClose={() => setKeysOpen(false)} />
    </Page>
  )
}

function EntryRow({ entry }: { entry: JournalEntry }) {
  const lang = entry.lang ?? entry.lesson?.tutor?.language
  return (
    <span className="flex flex-col gap-1">
      <span lang={lang} className="font-serif text-lg leading-6 wrap-anywhere">
        {entry.type === 'correction' ? (
          <>
            <s className="text-pen-red decoration-[1.5px]">{entry.original}</s>
            {entry.corrected && <strong className="font-semibold text-ink-green"> {entry.corrected}</strong>}
          </>
        ) : (
          <>
            <span className={entry.type === 'vocab' ? 'font-semibold' : undefined}>{entry.original}</span>
            {entry.corrected && <span className="text-muted"> — {entry.corrected}</span>}
          </>
        )}
      </span>
      {entry.explanation && <span className="text-[13px] leading-5 text-muted">{entry.explanation}</span>}
    </span>
  )
}
