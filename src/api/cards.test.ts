import { createSupabaseMock } from '@/test/supabaseMock'
import { translate } from '@/i18n'
import type { CardRow } from './types'

const mock = vi.hoisted(() => ({ current: null as ReturnType<typeof import('@/test/supabaseMock').createSupabaseMock> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock.current!.supabase
  },
  supabaseConfigured: true,
}))

import { addToDeck, deckStats, formatInterval, listDueCards, previewIntervals, removeFromDeck, reviewCard, scheduleCard } from './cards'

const now = new Date('2026-09-05T10:00:00Z')

function card(over: Partial<CardRow> = {}): CardRow {
  return {
    entry_id: 'e1',
    user_id: 'u1',
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
    ...over,
  }
}

beforeEach(() => {
  mock.current = createSupabaseMock()
})

const state = () => mock.current!.state

describe('scheduleCard', () => {
  it('maps the ts-fsrs card back to the row: Good on a new card enters Learning, due in 10 minutes', () => {
    const patch = scheduleCard(card(), 3, now)
    expect(patch).toMatchObject({ state: 1, reps: 1, lapses: 0, learning_steps: 1, last_review: now.toISOString() })
    expect(patch.due).toBe(new Date(now.getTime() + 10 * 60_000).toISOString())
    expect(patch.stability).toBeGreaterThan(0)
    expect(patch.difficulty).toBeGreaterThan(0)
  })

  it('Easy on a new card graduates to Review with a multi-day interval', () => {
    const patch = scheduleCard(card(), 4, now)
    expect(patch.state).toBe(2)
    expect(patch.scheduled_days).toBeGreaterThanOrEqual(1)
    expect(new Date(patch.due).getTime() - now.getTime()).toBeGreaterThanOrEqual(24 * 3_600_000)
  })

  it('Again on a Review card counts a lapse', () => {
    const patch = scheduleCard(card({ state: 2, stability: 10, difficulty: 5, reps: 3, last_review: '2026-08-20T10:00:00Z' }), 1, now)
    expect(patch.lapses).toBe(1)
    expect(patch.state).toBe(3)
  })
})

describe('reviewCard', () => {
  it('updates the row by entry_id with every FSRS field and last_review', async () => {
    state().results.push({ error: null })
    const row = card()
    const result = await reviewCard(row, 3, now)

    expect(state().calls[0].table).toBe('cards')
    const ops = state().ops(0)
    const patch = ops.update[0] as Record<string, unknown>
    expect(Object.keys(patch).sort()).toEqual(
      ['difficulty', 'due', 'elapsed_days', 'lapses', 'last_review', 'learning_steps', 'reps', 'scheduled_days', 'stability', 'state'].sort(),
    )
    expect(patch.last_review).toBe(now.toISOString())
    expect(ops.eq).toEqual(['entry_id', 'e1'])
    expect(result).toMatchObject({ entry_id: 'e1', user_id: 'u1', reps: 1 })
  })

  it('throws saveReview on a database error', async () => {
    state().results.push({ error: { message: 'row is locked' } })
    await expect(reviewCard(card(), 3, now)).rejects.toMatchObject({ code: 'saveReview', detail: 'row is locked' })
  })
})

describe('previewIntervals', () => {
  it('returns a human-readable interval for each of the four grades', () => {
    const t = translate('ru')
    expect(previewIntervals(card(), t, now)).toEqual({ 1: '1 мин', 2: '6 мин', 3: '10 мин', 4: '8 д' })
    expect(Object.values(previewIntervals(card(), translate('en'), now))).toEqual(['1 min', '6 min', '10 min', '8 d'])
  })
})

describe('formatInterval', () => {
  it('picks the unit by magnitude', () => {
    const t = translate('ru')
    expect(formatInterval(20_000, t)).toBe('<1 мин')
    expect(formatInterval(10 * 60_000, t)).toBe('10 мин')
    expect(formatInterval(3 * 3_600_000, t)).toBe('3 ч')
    expect(formatInterval(4 * 86_400_000, t)).toBe('4 д')
    expect(formatInterval(45 * 86_400_000, t)).toBe('2 мес')
    expect(formatInterval(400 * 86_400_000, t)).toBe('1.1 г')
  })
})

describe('deck membership', () => {
  it('addToDeck inserts a card row for the entry', async () => {
    state().results.push({ error: null })
    await addToDeck('e9')
    expect(state().calls[0].table).toBe('cards')
    expect(state().ops(0).insert).toEqual([{ entry_id: 'e9' }])
  })

  it('removeFromDeck deletes the card row by entry_id', async () => {
    state().results.push({ error: null })
    await removeFromDeck('e9')
    const ops = state().ops(0)
    expect(ops.delete).toEqual([])
    expect(ops.eq).toEqual(['entry_id', 'e9'])
  })

  it('surfaces errors with their codes', async () => {
    state().results.push({ error: { message: 'duplicate key' } })
    await expect(addToDeck('e9')).rejects.toMatchObject({ code: 'addToDeck' })
    state().results.push({ error: { message: 'denied' } })
    await expect(removeFromDeck('e9')).rejects.toMatchObject({ code: 'removeFromDeck' })
  })
})

describe('listDueCards', () => {
  it('filters by due, excludes deleted entries and flattens the lesson relation', async () => {
    state().results.push({
      data: [
        {
          ...card(),
          entry: {
            id: 'e1',
            type: 'vocab',
            original: 'zeszyt',
            corrected: 'тетрадь',
            explanation: null,
            quote: null,
            deleted_at: null,
            lesson: [{ date: '2026-09-05', tutor: { name: 'Анна', language: 'pl' } }],
          },
        },
        { ...card({ entry_id: 'e2' }), entry: { id: 'e2', type: 'rule', original: 'r', corrected: null, explanation: null, quote: null, deleted_at: null, lesson: null } },
      ],
    })
    const cards = await listDueCards(10)
    const ops = state().ops(0)
    expect(String(ops.select[0])).toContain('entries!inner')
    expect(ops.lte[0]).toBe('due')
    expect(ops.is).toEqual(['entry.deleted_at', null])
    expect(ops.order).toEqual(['due'])
    expect(ops.limit).toEqual([10])
    expect(cards[0].entry).toEqual({
      id: 'e1',
      type: 'vocab',
      original: 'zeszyt',
      corrected: 'тетрадь',
      explanation: null,
      quote: null,
      lesson: { date: '2026-09-05', tutor: { name: 'Анна', language: 'pl' } },
    })
    expect(cards[1].entry.lesson).toBeNull()
  })
})

describe('deckStats', () => {
  it('counts due, new and total cards', async () => {
    state().results.push({ count: 3 }, { count: 5 }, { count: 12 })
    await expect(deckStats()).resolves.toEqual({ due: 3, new: 5, total: 12 })
    expect(state().calls.map((c) => c.table)).toEqual(['cards', 'cards', 'cards'])
    expect(state().ops(0).lte[0]).toBe('due')
    expect(state().ops(1).eq).toEqual(['state', 0])
  })

  it('throws countCards when any query fails', async () => {
    state().results.push({ count: 3 }, { error: { message: 'timeout' } }, { count: 12 })
    await expect(deckStats()).rejects.toMatchObject({ code: 'countCards', detail: 'timeout' })
  })
})
