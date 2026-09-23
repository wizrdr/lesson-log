import { type CardInput, parseCardsBody } from './cards-input.ts'

export const ITEM_KINDS = ['lesson', 'reference', 'week'] as const
export const CALLOUT_TONES = ['note', 'warn', 'task'] as const
export const MAX_ITEMS = 50

export type ItemKind = (typeof ITEM_KINDS)[number]
export type CalloutTone = (typeof CALLOUT_TONES)[number]

export interface HeadingBlock { id: string; type: 'heading'; text: string; level: 2 | 3 }
export interface TextBlock { id: string; type: 'text'; md: string }
export interface CalloutBlock { id: string; type: 'callout'; tone: CalloutTone; title: string | null; md: string }
export interface TableBlock { id: string; type: 'table'; head: string[]; rows: string[][] }
export interface DialogTurn { who: string; pl: string; gloss: string | null }
export interface DialogBlock { id: string; type: 'dialog'; turns: DialogTurn[] }
export interface DrillItem { id: string; prompt: string; answers: string[]; note: string | null; hint: string | null }
export interface DrillBlock { id: string; type: 'drill'; title: string | null; bank: string[]; items: DrillItem[] }
export interface QuizOption { key: string; text: string }
export interface QuizBlock { id: string; type: 'quiz'; question: string; options: QuizOption[]; answer: string; ok: string; bad: string }
export interface RecallBlock { id: string; type: 'recall'; question: string; answer: string }
export interface ChecklistItem { id: string; md: string }
export interface ChecklistBlock { id: string; type: 'checklist'; title: string | null; items: ChecklistItem[] }

export type Block =
  | HeadingBlock | TextBlock | CalloutBlock | TableBlock | DialogBlock
  | DrillBlock | QuizBlock | RecallBlock | ChecklistBlock

export type BlockType = Block['type']

export interface CourseItemInput {
  slug: string
  kind: ItemKind
  position: number
  title: string
  subtitle: string | null
  week_start: string | null
  body: Block[]
  cards: CardInput[]
}

export interface CourseBody {
  course: { slug: string; title: string }
  items: CourseItemInput[]
}

export type CourseParseResult = { ok: true; value: CourseBody } | { ok: false; error: string }

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const SLUG = /^[a-z0-9][a-z0-9-]*$/
const ID = /^[a-z0-9][a-z0-9-]*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

function text(raw: Record<string, unknown>, key: string, at: string): Parsed<string> {
  const v = raw[key]
  if (typeof v !== 'string' || !v.trim()) return fail(`${at}.${key} must be a non-empty string`)
  return { ok: true, value: v.trim() }
}

function optionalText(raw: Record<string, unknown>, key: string, at: string): Parsed<string | null> {
  const v = raw[key]
  if (v === undefined || v === null) return { ok: true, value: null }
  if (typeof v !== 'string') return fail(`${at}.${key} must be a string`)
  return { ok: true, value: v.trim() || null }
}

function strings(raw: Record<string, unknown>, key: string, at: string, min: number): Parsed<string[]> {
  const v = raw[key] ?? (min === 0 ? [] : undefined)
  if (!Array.isArray(v) || v.length < min) return fail(`${at}.${key} must be an array of at least ${min} strings`)
  const out: string[] = []
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'string' || !v[i].trim()) return fail(`${at}.${key}[${i}] must be a non-empty string`)
    out.push(v[i].trim())
  }
  return { ok: true, value: out }
}

function id(raw: Record<string, unknown>, at: string): Parsed<string> {
  const v = raw.id
  if (typeof v !== 'string' || !ID.test(v)) return fail(`${at}.id must match ${ID}`)
  return { ok: true, value: v }
}

function records(raw: Record<string, unknown>, key: string, at: string): Parsed<Record<string, unknown>[]> {
  const v = raw[key]
  if (!Array.isArray(v) || v.length === 0) return fail(`${at}.${key} must be a non-empty array`)
  for (let i = 0; i < v.length; i++) if (!isRecord(v[i])) return fail(`${at}.${key}[${i}] must be an object`)
  return { ok: true, value: v as Record<string, unknown>[] }
}

function uniqueIds(list: { id: string }[], at: string): Parsed<true> {
  const seen = new Set<string>()
  for (const x of list) {
    if (seen.has(x.id)) return fail(`${at}: duplicate id "${x.id}"`)
    seen.add(x.id)
  }
  return { ok: true, value: true }
}

// Each branch returns early on the first invalid field, so errors point at one exact path.
function parseBlock(raw: unknown, at: string): Parsed<Block> {
  if (!isRecord(raw)) return fail(`${at} must be an object`)
  const bid = id(raw, at)
  if (!bid.ok) return bid

  switch (raw.type) {
    case 'heading': {
      const t = text(raw, 'text', at); if (!t.ok) return t
      const level = raw.level === undefined ? 2 : raw.level
      if (level !== 2 && level !== 3) return fail(`${at}.level must be 2 or 3`)
      return { ok: true, value: { id: bid.value, type: 'heading', text: t.value, level } }
    }
    case 'text': {
      const md = text(raw, 'md', at); if (!md.ok) return md
      return { ok: true, value: { id: bid.value, type: 'text', md: md.value } }
    }
    case 'callout': {
      if (!(CALLOUT_TONES as readonly unknown[]).includes(raw.tone)) return fail(`${at}.tone must be one of ${CALLOUT_TONES.join(', ')}`)
      const title = optionalText(raw, 'title', at); if (!title.ok) return title
      const md = text(raw, 'md', at); if (!md.ok) return md
      return { ok: true, value: { id: bid.value, type: 'callout', tone: raw.tone as CalloutTone, title: title.value, md: md.value } }
    }
    case 'table': {
      const head = strings(raw, 'head', at, 1); if (!head.ok) return head
      const rows = raw.rows
      if (!Array.isArray(rows) || rows.length === 0) return fail(`${at}.rows must be a non-empty array`)
      const out: string[][] = []
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]
        if (!Array.isArray(row) || row.length !== head.value.length) return fail(`${at}.rows[${r}] must have ${head.value.length} cells`)
        if (row.some((c) => typeof c !== 'string')) return fail(`${at}.rows[${r}] cells must be strings`)
        out.push(row.map((c: string) => c.trim()))
      }
      return { ok: true, value: { id: bid.value, type: 'table', head: head.value, rows: out } }
    }
    case 'dialog': {
      const turns = records(raw, 'turns', at); if (!turns.ok) return turns
      const out: DialogTurn[] = []
      for (let i = 0; i < turns.value.length; i++) {
        const t = turns.value[i]; const ta = `${at}.turns[${i}]`
        const who = text(t, 'who', ta); if (!who.ok) return who
        const pl = text(t, 'pl', ta); if (!pl.ok) return pl
        const gloss = optionalText(t, 'gloss', ta); if (!gloss.ok) return gloss
        out.push({ who: who.value, pl: pl.value, gloss: gloss.value })
      }
      return { ok: true, value: { id: bid.value, type: 'dialog', turns: out } }
    }
    case 'drill': {
      const title = optionalText(raw, 'title', at); if (!title.ok) return title
      const bank = strings(raw, 'bank', at, 0); if (!bank.ok) return bank
      const items = records(raw, 'items', at); if (!items.ok) return items
      const out: DrillItem[] = []
      for (let i = 0; i < items.value.length; i++) {
        const it = items.value[i]; const ia = `${at}.items[${i}]`
        const iid = id(it, ia); if (!iid.ok) return iid
        const prompt = text(it, 'prompt', ia); if (!prompt.ok) return prompt
        const answers = strings(it, 'answers', ia, 1); if (!answers.ok) return answers
        const note = optionalText(it, 'note', ia); if (!note.ok) return note
        const hint = optionalText(it, 'hint', ia); if (!hint.ok) return hint
        out.push({ id: iid.value, prompt: prompt.value, answers: answers.value, note: note.value, hint: hint.value })
      }
      const u = uniqueIds(out, `${at}.items`); if (!u.ok) return u
      return { ok: true, value: { id: bid.value, type: 'drill', title: title.value, bank: bank.value, items: out } }
    }
    case 'quiz': {
      const question = text(raw, 'question', at); if (!question.ok) return question
      const opts = records(raw, 'options', at); if (!opts.ok) return opts
      const options: QuizOption[] = []
      for (let i = 0; i < opts.value.length; i++) {
        const oa = `${at}.options[${i}]`
        const key = text(opts.value[i], 'key', oa); if (!key.ok) return key
        const t = text(opts.value[i], 'text', oa); if (!t.ok) return t
        options.push({ key: key.value, text: t.value })
      }
      const answer = text(raw, 'answer', at); if (!answer.ok) return answer
      if (!options.some((o) => o.key === answer.value)) return fail(`${at}.answer must be one of the option keys`)
      const ok = text(raw, 'ok', at); if (!ok.ok) return ok
      const bad = text(raw, 'bad', at); if (!bad.ok) return bad
      return { ok: true, value: { id: bid.value, type: 'quiz', question: question.value, options, answer: answer.value, ok: ok.value, bad: bad.value } }
    }
    case 'recall': {
      const question = text(raw, 'question', at); if (!question.ok) return question
      const answer = text(raw, 'answer', at); if (!answer.ok) return answer
      return { ok: true, value: { id: bid.value, type: 'recall', question: question.value, answer: answer.value } }
    }
    case 'checklist': {
      const title = optionalText(raw, 'title', at); if (!title.ok) return title
      const items = records(raw, 'items', at); if (!items.ok) return items
      const out: ChecklistItem[] = []
      for (let i = 0; i < items.value.length; i++) {
        const ia = `${at}.items[${i}]`
        const iid = id(items.value[i], ia); if (!iid.ok) return iid
        const md = text(items.value[i], 'md', ia); if (!md.ok) return md
        out.push({ id: iid.value, md: md.value })
      }
      const u = uniqueIds(out, `${at}.items`); if (!u.ok) return u
      return { ok: true, value: { id: bid.value, type: 'checklist', title: title.value, items: out } }
    }
    default:
      return fail(`${at}.type is unknown: ${JSON.stringify(raw.type)}`)
  }
}

export function parseBlocks(raw: unknown, at = 'body'): Parsed<Block[]> {
  if (!Array.isArray(raw)) return fail(`${at} must be an array`)
  const out: Block[] = []
  for (let i = 0; i < raw.length; i++) {
    const b = parseBlock(raw[i], `${at}[${i}]`)
    if (!b.ok) return b
    out.push(b.value)
  }
  const u = uniqueIds(out, at); if (!u.ok) return u
  return { ok: true, value: out }
}

function parseItem(raw: unknown, at: string): Parsed<CourseItemInput> {
  if (!isRecord(raw)) return fail(`${at} must be an object`)
  if (typeof raw.slug !== 'string' || !SLUG.test(raw.slug)) return fail(`${at}.slug must match ${SLUG}`)
  if (!(ITEM_KINDS as readonly unknown[]).includes(raw.kind)) return fail(`${at}.kind must be one of ${ITEM_KINDS.join(', ')}`)
  const position = raw.position ?? 0
  if (typeof position !== 'number' || !Number.isInteger(position)) return fail(`${at}.position must be an integer`)
  const title = text(raw, 'title', at); if (!title.ok) return title
  const subtitle = optionalText(raw, 'subtitle', at); if (!subtitle.ok) return subtitle
  const week = optionalText(raw, 'week_start', at); if (!week.ok) return week
  if (week.value && !DATE.test(week.value)) return fail(`${at}.week_start must be YYYY-MM-DD`)
  if (raw.kind === 'week' && !week.value) return fail(`${at}.week_start is required for kind week`)
  const body = parseBlocks(raw.body, `${at}.body`); if (!body.ok) return body

  let cards: CardInput[] = []
  if (raw.cards !== undefined && !(Array.isArray(raw.cards) && raw.cards.length === 0)) {
    const parsed = parseCardsBody({ cards: raw.cards })
    if (!parsed.ok) return fail(`${at}.${parsed.error}`)
    cards = parsed.cards
  }

  return {
    ok: true,
    value: {
      slug: raw.slug, kind: raw.kind as ItemKind, position, title: title.value, subtitle: subtitle.value,
      week_start: week.value, body: body.value, cards,
    },
  }
}

export function parseCourseBody(raw: unknown): CourseParseResult {
  if (!isRecord(raw)) return fail('body must be an object')
  const course = raw.course
  if (!isRecord(course)) return fail('course must be an object')
  if (typeof course.slug !== 'string' || !SLUG.test(course.slug)) return fail(`course.slug must match ${SLUG}`)
  const title = text(course, 'title', 'course'); if (!title.ok) return title

  const items = raw.items
  if (!Array.isArray(items) || items.length === 0) return fail('items must be a non-empty array')
  if (items.length > MAX_ITEMS) return fail(`items: at most ${MAX_ITEMS} per request`)
  const out: CourseItemInput[] = []
  const slugs = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    const item = parseItem(items[i], `items[${i}]`)
    if (!item.ok) return item
    if (slugs.has(item.value.slug)) return fail(`items[${i}].slug duplicates "${item.value.slug}"`)
    slugs.add(item.value.slug)
    out.push(item.value)
  }
  return { ok: true, value: { course: { slug: course.slug, title: title.value }, items: out } }
}
