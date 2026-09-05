export const ENTRY_TYPES = ['correction', 'vocab', 'rule'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export interface ExtractedItem {
  type: EntryType
  original: string
  corrected: string
  explanation: string
  quote: string
}

export const CHUNK_CHARS = 100_000

export const SYSTEM = `Ты разбираешь транскрипт урока иностранного языка (польский или английский) с репетитором. Речь смешана с русским. Реплики могут быть подписаны как Speaker 0 / Speaker 1 или идти без подписей — сам определи, кто репетитор, а кто студент.

Извлеки из транскрипта все пункты трёх типов:
- correction — репетитор исправляет студента: грамматика, лексика, произношение, порядок слов. original — что сказал студент, corrected — как правильно.
- vocab — новое слово или выражение, которое репетитор объяснял или переводил. original — слово/выражение на изучаемом языке, corrected — перевод или значение.
- rule — явно сформулированное репетитором правило. original — пример или контекст, corrected — правильная форма или формулировка правила кратко.

Для каждого пункта:
- explanation — короткое объяснение по-русски, почему так (1–2 предложения). Если репетитор объяснил — перескажи его объяснение.
- quote — дословная цитата из транскрипта (фрагмент реплики, включая ошибки распознавания), по которой человек найдёт этот момент. Не редактируй цитату.

Не выдумывай исправлений, которых нет в транскрипте. Ошибки распознавания речи — не ошибки студента. Если репетитор просто переспросил или повторил без исправления — это не correction. Если пунктов нет — верни пустой массив.`

export const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ENTRY_TYPES },
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanation: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['type', 'original', 'corrected', 'explanation', 'quote'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

export function userPrompt(chunk: string, index: number, total: number): string {
  return `Транскрипт${total > 1 ? ` (часть ${index + 1} из ${total})` : ''}:\n\n${chunk}`
}

export function splitTranscript(text: string, limit = CHUNK_CHARS): string[] {
  if (text.length <= limit) return [text]
  const parts: string[] = []
  let current = ''
  for (const line of text.split('\n')) {
    if (current.length + line.length + 1 > limit && current) {
      parts.push(current)
      current = ''
    }
    current += line + '\n'
  }
  if (current.trim()) parts.push(current)
  return parts
}

function isEntryType(value: unknown): value is EntryType {
  return typeof value === 'string' && (ENTRY_TYPES as readonly string[]).includes(value)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeItems(output: unknown): ExtractedItem[] {
  if (typeof output !== 'object' || output === null) throw new Error('extraction output is not an object')
  const raw = (output as { items?: unknown }).items
  if (!Array.isArray(raw)) throw new Error('extraction output has no items array')
  const items: ExtractedItem[] = []
  for (const it of raw) {
    if (typeof it !== 'object' || it === null) continue
    const rec = it as Record<string, unknown>
    const original = str(rec.original)
    if (!isEntryType(rec.type) || !original) continue
    items.push({
      type: rec.type,
      original,
      corrected: str(rec.corrected),
      explanation: str(rec.explanation),
      quote: str(rec.quote),
    })
  }
  return items
}
