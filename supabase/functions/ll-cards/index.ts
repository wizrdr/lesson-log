import { type Db, authenticate, orThrow, serviceClient } from '../_shared/auth.ts'
import { type CardInput, dedupKey, parseCardsBody } from '../_shared/cards-input.ts'
import { corsHeaders, json, readJson } from '../_shared/http.ts'

type EntryRef = { id: string; original: string }
type ExistingRow = EntryRef & { type: string }

async function count(db: Db, userId: string, due: boolean): Promise<number> {
  let query = db.from('cards').select('entry_id', { count: 'exact', head: true }).eq('user_id', userId)
  if (due) query = query.lte('due', new Date().toISOString())
  const { count: n, error } = await query
  if (error) throw new Error(`cards count failed: ${error.message}`)
  return n ?? 0
}

async function existingEntries(db: Db, userId: string): Promise<Map<string, EntryRef>> {
  const rows = orThrow(
    await db.from('entries').select('id, type, original').eq('user_id', userId).is('deleted_at', null),
    'entries lookup failed',
  ) as ExistingRow[]
  return new Map(rows.map((r) => [dedupKey(r.type, r.original), { id: r.id, original: r.original }]))
}

async function insertCards(db: Db, userId: string, cards: CardInput[]): Promise<EntryRef[]> {
  if (cards.length === 0) return []
  const rows = cards.map((c) => ({ ...c, lesson_id: null, user_id: userId }))
  const entries = orThrow(await db.from('entries').insert(rows).select('id, original'), 'entries insert failed') as EntryRef[]
  orThrow(await db.from('cards').insert(entries.map((e) => ({ entry_id: e.id, user_id: userId }))), 'cards insert failed')
  return entries
}

async function importCards(db: Db, userId: string, cards: CardInput[]): Promise<{ created: EntryRef[]; skipped: EntryRef[] }> {
  const existing = await existingEntries(db, userId)
  const fresh = new Map<string, CardInput>()
  for (const card of cards) {
    const key = dedupKey(card.type, card.original)
    if (!existing.has(key) && !fresh.has(key)) fresh.set(key, card)
  }
  const inserted = await insertCards(db, userId, [...fresh.values()])
  const created = new Map([...fresh.keys()].map((key, i) => [key, inserted[i]]))

  const result = { created: [] as EntryRef[], skipped: [] as EntryRef[] }
  const seen = new Set<string>()
  for (const card of cards) {
    const key = dedupKey(card.type, card.original)
    const known = existing.get(key)
    if (known) result.skipped.push(known)
    else if (seen.has(key)) result.skipped.push(created.get(key)!)
    else result.created.push(created.get(key)!)
    seen.add(key)
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'GET' && req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const db = serviceClient()
  try {
    const userId = await authenticate(db, req)
    if (!userId) return json(req, 401, { error: 'unauthorized' })

    if (req.method === 'GET') {
      const [due, total] = await Promise.all([count(db, userId, true), count(db, userId, false)])
      return json(req, 200, { deck: { due, total } })
    }

    const parsed = parseCardsBody(await readJson(req))
    if (!parsed.ok) return json(req, 400, { error: parsed.error })
    return json(req, 201, await importCards(db, userId, parsed.cards))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('ll-cards', message)
    return json(req, 500, { error: message })
  }
})
