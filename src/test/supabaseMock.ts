export interface QueryCall {
  table: string
  ops: [string, unknown[]][]
}

export interface QueryResult {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

export interface SupabaseMockState {
  calls: QueryCall[]
  results: QueryResult[]
  reset(): void
  ops(index: number): Record<string, unknown[]>
}

const METHODS = ['select', 'insert', 'update', 'delete', 'eq', 'lte', 'is', 'not', 'or', 'order', 'limit', 'single']

export function createSupabaseMock() {
  const state: SupabaseMockState = {
    calls: [],
    results: [],
    reset() {
      state.calls = []
      state.results = []
    },
    ops(index) {
      return Object.fromEntries(state.calls[index].ops)
    },
  }
  const from = (table: string) => {
    const call: QueryCall = { table, ops: [] }
    state.calls.push(call)
    const chain: Record<string, unknown> = {}
    for (const m of METHODS) {
      chain[m] = (...args: unknown[]) => {
        call.ops.push([m, args])
        return chain
      }
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      const next = state.results.shift() ?? {}
      return Promise.resolve({ data: next.data ?? null, error: next.error ?? null, count: next.count ?? null }).then(resolve, reject)
    }
    return chain
  }
  const supabase = {
    from,
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null }) },
  }
  return { state, supabase }
}
