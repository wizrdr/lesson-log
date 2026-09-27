export const SKILLS = ['sluchanie', 'czytanie', 'gramatyka', 'pisanie', 'mowienie'] as const
export const TOPIC_STATUSES = ['open', 'in_progress', 'closed'] as const
export const CHECKPOINT_STATUSES = ['upcoming', 'passed', 'failed'] as const

export type SkillKey = (typeof SKILLS)[number]
export type TopicStatus = (typeof TOPIC_STATUSES)[number]
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number]

export interface Score { got: number; max: number }
export interface LevelSkill { key: SkillKey; cefr: string; note: string | null }
export interface LevelTest { id: string; date: string; title: string; url: string | null; scores: Partial<Record<SkillKey, Score>>; note: string | null }
export interface LevelTopic { id: string; title: string; skill: SkillKey; status: TopicStatus; item_slug: string | null; note: string | null }
export interface LevelCheckpoint { id: string; date: string; title: string; rule: string | null; status: CheckpointStatus }

export interface LevelDoc {
  summary: { overall: string; verdict: string | null; updated_on: string }
  skills: LevelSkill[]
  tests: LevelTest[]
  topics: LevelTopic[]
  checkpoints: LevelCheckpoint[]
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const ID = /^[a-z0-9][a-z0-9-]*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_LIST = 200

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
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

function date(raw: Record<string, unknown>, key: string, at: string): Parsed<string> {
  const v = raw[key]
  if (typeof v !== 'string' || !DATE.test(v)) return fail(`${at}.${key} must be YYYY-MM-DD`)
  return { ok: true, value: v }
}

function id(raw: Record<string, unknown>, at: string): Parsed<string> {
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) return fail(`${at}.id must match ${ID}`)
  return { ok: true, value: raw.id }
}

function oneOf<T extends string>(raw: Record<string, unknown>, key: string, allowed: readonly T[], at: string): Parsed<T> {
  const v = raw[key]
  if (!(allowed as readonly unknown[]).includes(v)) return fail(`${at}.${key} must be one of ${allowed.join(', ')}`)
  return { ok: true, value: v as T }
}

function list<T>(raw: Record<string, unknown>, key: string, parse: (r: Record<string, unknown>, at: string) => Parsed<T>): Parsed<T[]> {
  const v = raw[key] ?? []
  if (!Array.isArray(v) || v.length > MAX_LIST) return fail(`${key} must be an array of at most ${MAX_LIST}`)
  const out: T[] = []
  const ids = new Set<string>()
  for (let i = 0; i < v.length; i++) {
    const at = `${key}[${i}]`
    if (!isRecord(v[i])) return fail(`${at} must be an object`)
    const p = parse(v[i], at)
    if (!p.ok) return p
    const pid = (p.value as { id?: string; key?: string }).id ?? (p.value as { key?: string }).key
    if (pid !== undefined) {
      if (ids.has(pid)) return fail(`${at}: duplicate "${pid}"`)
      ids.add(pid)
    }
    out.push(p.value)
  }
  return { ok: true, value: out }
}

function parseScores(raw: unknown, at: string): Parsed<Partial<Record<SkillKey, Score>>> {
  if (!isRecord(raw)) return fail(`${at} must be an object`)
  const out: Partial<Record<SkillKey, Score>> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!(SKILLS as readonly string[]).includes(k)) return fail(`${at}.${k} is not a skill`)
    if (v === null) continue
    if (!isRecord(v)) return fail(`${at}.${k} must be { got, max } or null`)
    const { got, max } = v
    if (typeof got !== 'number' || typeof max !== 'number' || max <= 0 || got < 0 || got > max) return fail(`${at}.${k} must have 0 <= got <= max, max > 0`)
    out[k as SkillKey] = { got, max }
  }
  return { ok: true, value: out }
}

const parseSkill = (r: Record<string, unknown>, at: string): Parsed<LevelSkill> => {
  const key = oneOf(r, 'key', SKILLS, at); if (!key.ok) return key
  const cefr = text(r, 'cefr', at); if (!cefr.ok) return cefr
  const note = optionalText(r, 'note', at); if (!note.ok) return note
  return { ok: true, value: { key: key.value, cefr: cefr.value, note: note.value } }
}

const parseTest = (r: Record<string, unknown>, at: string): Parsed<LevelTest> => {
  const tid = id(r, at); if (!tid.ok) return tid
  const d = date(r, 'date', at); if (!d.ok) return d
  const title = text(r, 'title', at); if (!title.ok) return title
  const url = optionalText(r, 'url', at); if (!url.ok) return url
  if (url.value && !url.value.startsWith('https://')) return fail(`${at}.url must start with https://`)
  const scores = parseScores(r.scores, `${at}.scores`); if (!scores.ok) return scores
  const note = optionalText(r, 'note', at); if (!note.ok) return note
  return { ok: true, value: { id: tid.value, date: d.value, title: title.value, url: url.value, scores: scores.value, note: note.value } }
}

const parseTopic = (r: Record<string, unknown>, at: string): Parsed<LevelTopic> => {
  const tid = id(r, at); if (!tid.ok) return tid
  const title = text(r, 'title', at); if (!title.ok) return title
  const skill = oneOf(r, 'skill', SKILLS, at); if (!skill.ok) return skill
  const status = oneOf(r, 'status', TOPIC_STATUSES, at); if (!status.ok) return status
  const slug = optionalText(r, 'item_slug', at); if (!slug.ok) return slug
  if (slug.value && !ID.test(slug.value)) return fail(`${at}.item_slug must match ${ID}`)
  const note = optionalText(r, 'note', at); if (!note.ok) return note
  return { ok: true, value: { id: tid.value, title: title.value, skill: skill.value, status: status.value, item_slug: slug.value, note: note.value } }
}

const parseCheckpoint = (r: Record<string, unknown>, at: string): Parsed<LevelCheckpoint> => {
  const cid = id(r, at); if (!cid.ok) return cid
  const d = date(r, 'date', at); if (!d.ok) return d
  const title = text(r, 'title', at); if (!title.ok) return title
  const rule = optionalText(r, 'rule', at); if (!rule.ok) return rule
  const status = oneOf(r, 'status', CHECKPOINT_STATUSES, at); if (!status.ok) return status
  return { ok: true, value: { id: cid.value, date: d.value, title: title.value, rule: rule.value, status: status.value } }
}

export function parseLevelDoc(raw: unknown): Parsed<LevelDoc> {
  if (!isRecord(raw)) return fail('body must be an object')
  const s = raw.summary
  if (!isRecord(s)) return fail('summary must be an object')
  const overall = text(s, 'overall', 'summary'); if (!overall.ok) return overall
  const verdict = optionalText(s, 'verdict', 'summary'); if (!verdict.ok) return verdict
  const updated = date(s, 'updated_on', 'summary'); if (!updated.ok) return updated
  const skills = list(raw, 'skills', parseSkill); if (!skills.ok) return skills
  const tests = list(raw, 'tests', parseTest); if (!tests.ok) return tests
  const topics = list(raw, 'topics', parseTopic); if (!topics.ok) return topics
  const checkpoints = list(raw, 'checkpoints', parseCheckpoint); if (!checkpoints.ok) return checkpoints
  return {
    ok: true,
    value: {
      summary: { overall: overall.value, verdict: verdict.value, updated_on: updated.value },
      skills: skills.value,
      tests: [...tests.value].sort((a, b) => (a.date < b.date ? -1 : 1)),
      topics: topics.value,
      checkpoints: [...checkpoints.value].sort((a, b) => (a.date < b.date ? -1 : 1)),
    },
  }
}
