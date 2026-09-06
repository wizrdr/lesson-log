export const MAX_CARDS = 100

export const CARD_TYPES = ['vocab', 'correction', 'rule'] as const
export const CARD_LANGS = ['pl', 'en'] as const

export type CardType = (typeof CARD_TYPES)[number]
export type CardLang = (typeof CARD_LANGS)[number]

export interface CardInput {
  type: CardType
  original: string
  corrected: string | null
  explanation: string | null
  lang: CardLang | null
}

export type ParseResult = { ok: true; cards: CardInput[] } | { ok: false; error: string }

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalText(value: unknown, field: string): Parsed<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` }
  return { ok: true, value: value.trim() || null }
}

function parseCard(raw: unknown, index: number): Parsed<CardInput> {
  const at = `cards[${index}]`
  if (!isRecord(raw)) return { ok: false, error: `${at} must be an object` }

  const type = raw.type
  if (typeof type !== 'string' || !(CARD_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: `${at}.type must be one of ${CARD_TYPES.join(', ')}` }
  }
  const original = typeof raw.original === 'string' ? raw.original.trim() : ''
  if (!original) return { ok: false, error: `${at}.original must be a non-empty string` }

  const corrected = optionalText(raw.corrected, `${at}.corrected`)
  if (!corrected.ok) return corrected
  const explanation = optionalText(raw.explanation, `${at}.explanation`)
  if (!explanation.ok) return explanation

  const lang = raw.lang
  if (lang !== undefined && lang !== null && !(CARD_LANGS as readonly unknown[]).includes(lang)) {
    return { ok: false, error: `${at}.lang must be one of ${CARD_LANGS.join(', ')}` }
  }

  return {
    ok: true,
    value: {
      type: type as CardType,
      original,
      corrected: corrected.value,
      explanation: explanation.value,
      lang: (lang as CardLang | undefined) ?? null,
    },
  }
}

export function parseCardsBody(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'body must be a JSON object' }
  const list = body.cards
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: 'cards must be a non-empty array' }
  if (list.length > MAX_CARDS) return { ok: false, error: `cards must have at most ${MAX_CARDS} items` }

  const cards: CardInput[] = []
  for (let i = 0; i < list.length; i++) {
    const parsed = parseCard(list[i], i)
    if (!parsed.ok) return parsed
    cards.push(parsed.value)
  }
  return { ok: true, cards }
}

export function dedupKey(type: string, original: string): string {
  return `${type} ${original.trim().toLocaleLowerCase()}`
}
