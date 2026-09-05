const order = vi.fn()

vi.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    not: () => chain,
    order: (...args: unknown[]) => order(...args),
  }
  return { supabase: { from: () => chain }, supabaseConfigured: true }
})

import { groupRecurringCorrections, listRecurringCorrections } from './entries'

const row = (lesson_id: string, original: string, corrected: string | null) => ({ lesson_id, original, corrected })

describe('groupRecurringCorrections', () => {
  it('groups by corrected text ignoring case and whitespace, keeps the most recent original', () => {
    const result = groupRecurringCorrections([
      row('l3', 'poszłem', 'Poszedłem '),
      row('l2', 'poszlem', 'poszedłem'),
      row('l1', 'ja poszłem', 'poszedłem'),
    ])
    expect(result).toEqual([{ original: 'poszłem', corrected: 'Poszedłem', lessonCount: 3 }])
  })

  it('needs at least two distinct lessons: repeats inside one lesson do not count', () => {
    expect(
      groupRecurringCorrections([
        row('l1', 'w Warszawa', 'w Warszawie'),
        row('l1', 'w Warszawa', 'w Warszawie'),
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
    order.mockResolvedValue({ data: [row('l1', 'poszłem', 'poszedłem'), row('l2', 'poszlem', 'poszedłem')], error: null })
    await expect(listRecurringCorrections()).resolves.toEqual([{ original: 'poszłem', corrected: 'poszedłem', lessonCount: 2 }])
    expect(order).toHaveBeenCalledTimes(1)
  })

  it('surfaces query errors', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(listRecurringCorrections()).rejects.toMatchObject({ code: 'loadCorrections', detail: 'permission denied' })
  })
})
