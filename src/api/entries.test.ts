import { createSupabaseMock } from '@/test/supabaseMock'

const mock = vi.hoisted(() => ({ current: null as ReturnType<typeof import('@/test/supabaseMock').createSupabaseMock> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock.current!.supabase
  },
  supabaseConfigured: true,
}))

import { createManualEntry, groupRecurringCorrections, listEntries, listEntriesByLesson, listRecurringCorrections, softDeleteEntry, updateEntry } from './entries'

beforeEach(() => {
  mock.current = createSupabaseMock()
})

const state = () => mock.current!.state

const row = (lesson_id: string | null, original: string, corrected: string | null) => ({ lesson_id, original, corrected })

const base = {
  user_id: 'u1',
  type: 'vocab' as const,
  corrected: null,
  explanation: null,
  quote: null,
  lang: null,
  created_at: '2026-09-05T10:00:00Z',
  deleted_at: null,
}

describe('groupRecurringCorrections', () => {
  it('groups by corrected text ignoring case and whitespace, keeps the most recent original', () => {
    const result = groupRecurringCorrections([
      row('l3', 'poszłem', 'Poszedłem '),
      row('l2', 'poszlem', 'poszedłem'),
      row('l1', 'ja poszłem', 'poszedłem'),
    ])
    expect(result).toEqual([{ original: 'poszłem', corrected: 'Poszedłem', lessonCount: 3 }])
  })

  it('needs at least two distinct lessons: repeats inside one lesson and manual entries do not count', () => {
    expect(
      groupRecurringCorrections([
        row('l1', 'w Warszawa', 'w Warszawie'),
        row('l1', 'w Warszawa', 'w Warszawie'),
        row(null, 'w Warszawa', 'w Warszawie'),
        row('l2', 'dwa kobiety', 'dwie kobiety'),
      ]),
    ).toEqual([])
  })

  it('sorts by lesson count and skips rows without corrected', () => {
    const result = groupRecurringCorrections([
      row('l1', 'a', 'b'),
      row('l2', 'a', 'b'),
      row('l1', 'x', 'y'),
      row('l2', 'x', 'y'),
      row('l3', 'x', 'y'),
      row('l1', 'rule', null),
      row('l2', 'rule', null),
    ])
    expect(result.map((r) => [r.corrected, r.lessonCount])).toEqual([
      ['y', 3],
      ['b', 2],
    ])
  })
})

describe('listRecurringCorrections', () => {
  it('queries corrections once and groups the rows', async () => {
    state().results.push({ data: [row('l1', 'poszłem', 'poszedłem'), row('l2', 'poszlem', 'poszedłem')] })
    await expect(listRecurringCorrections()).resolves.toEqual([{ original: 'poszłem', corrected: 'poszedłem', lessonCount: 2 }])
    expect(state().calls).toHaveLength(1)
  })

  it('surfaces query errors', async () => {
    state().results.push({ data: null, error: { message: 'permission denied' } })
    await expect(listRecurringCorrections()).rejects.toMatchObject({ code: 'loadCorrections', detail: 'permission denied' })
  })
})

describe('listEntriesByLesson', () => {
  it('joins the card and normalizes it to an object or null', async () => {
    state().results.push({
      data: [
        { ...base, id: 'e1', lesson_id: 'l1', original: 'a', card: [{ due: '2026-09-01T00:00:00Z' }] },
        { ...base, id: 'e2', lesson_id: 'l1', original: 'b', card: null },
      ],
    })
    const entries = await listEntriesByLesson('l1')
    expect(entries.map((e) => e.card)).toEqual([{ due: '2026-09-01T00:00:00Z' }, null])
    const ops = state().ops(0)
    expect(ops.eq).toEqual(['lesson_id', 'l1'])
    expect(ops.is).toEqual(['deleted_at', null])
  })
})

describe('listEntries', () => {
  it('loads non-deleted entries with the inDeck flag and lesson meta', async () => {
    state().results.push({
      data: [
        { ...base, id: 'e1', lesson_id: 'l1', original: 'zeszyt', card: { entry_id: 'e1' }, lesson: { id: 'l1', date: '2026-09-05', tutor: [{ name: 'Анна', language: 'pl' }] } },
        { ...base, id: 'e2', lesson_id: null, original: 'manual', card: null, lesson: null },
      ],
    })
    const entries = await listEntries()
    expect(entries).toEqual([
      expect.objectContaining({ id: 'e1', inDeck: true, lesson: { id: 'l1', date: '2026-09-05', tutor: { name: 'Анна', language: 'pl' } } }),
      expect.objectContaining({ id: 'e2', inDeck: false, lesson: null }),
    ])
    const ops = state().ops(0)
    expect(String(ops.select[0])).toContain('lesson:lessons(')
    expect(ops.is).toEqual(['deleted_at', null])
    expect(ops.eq).toBeUndefined()
    expect(ops.or).toBeUndefined()
    expect(ops.order).toEqual(['created_at', { ascending: false }])
  })

  it('applies the type filter', async () => {
    state().results.push({ data: [] })
    await listEntries({ type: 'vocab' })
    expect(state().ops(0).eq).toEqual(['type', 'vocab'])
  })

  it('searches original and corrected with a quoted ilike pattern', async () => {
    state().results.push({ data: [] })
    await listEntries({ search: ' po"sz ' })
    expect(state().ops(0).or).toEqual(['original.ilike."%po\\"sz%",corrected.ilike."%po\\"sz%"'])
  })

  it('filters by tutor through an inner join on lessons', async () => {
    state().results.push({ data: [] })
    await listEntries({ tutorId: 't1' })
    const ops = state().ops(0)
    expect(String(ops.select[0])).toContain('lesson:lessons!inner(')
    expect(ops.eq).toEqual(['lesson.tutor_id', 't1'])
  })

  it('surfaces errors as loadEntries', async () => {
    state().results.push({ data: null, error: { message: 'boom' } })
    await expect(listEntries()).rejects.toMatchObject({ code: 'loadEntries', detail: 'boom' })
  })
})

describe('createManualEntry', () => {
  it('inserts the entry without a lesson and a card row right after', async () => {
    const created = { ...base, id: 'e9', lesson_id: null, original: 'kot', corrected: 'кот' }
    state().results.push({ data: created }, { error: null })
    const entry = await createManualEntry({ type: 'vocab', original: ' kot ', corrected: ' кот ', explanation: '  ', lang: 'pl' })
    expect(entry).toEqual({ ...created, inDeck: true, lesson: null })

    expect(state().calls.map((c) => c.table)).toEqual(['entries', 'cards'])
    expect(state().ops(0).insert).toEqual([{ type: 'vocab', original: 'kot', corrected: 'кот', explanation: null, lang: 'pl', lesson_id: null }])
    expect(state().ops(1).insert).toEqual([{ entry_id: 'e9' }])
  })

  it('does not create a card when the entry insert fails', async () => {
    state().results.push({ data: null, error: { message: 'check violation' } })
    await expect(createManualEntry({ type: 'rule', original: 'x', corrected: null, explanation: null, lang: null })).rejects.toMatchObject({ code: 'saveEntry' })
    expect(state().calls).toHaveLength(1)
  })
})

describe('updateEntry / softDeleteEntry', () => {
  it('updateEntry patches the trimmed fields by id', async () => {
    const updated = { ...base, id: 'e1', lesson_id: 'l1', original: 'a', corrected: 'b' }
    state().results.push({ data: updated })
    await expect(updateEntry('e1', { type: 'correction', original: 'a ', corrected: 'b', explanation: '', lang: null })).resolves.toEqual(updated)
    const ops = state().ops(0)
    expect(ops.update).toEqual([{ type: 'correction', original: 'a', corrected: 'b', explanation: null, lang: null }])
    expect(ops.eq).toEqual(['id', 'e1'])
  })

  it('softDeleteEntry removes the card and stamps deleted_at', async () => {
    state().results.push({ error: null }, { error: null })
    await softDeleteEntry('e1')
    expect(state().calls.map((c) => c.table)).toEqual(['cards', 'entries'])
    const update = state().ops(1).update[0] as { deleted_at: string }
    expect(typeof update.deleted_at).toBe('string')
    expect(state().ops(1).eq).toEqual(['id', 'e1'])
  })
})
