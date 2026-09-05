import { ApiError, client } from './client'

export async function countDueCards(): Promise<number> {
  const { count, error } = await client()
    .from('cards')
    .select('entry_id', { count: 'exact', head: true })
    .lte('due', new Date().toISOString())
  if (error) throw new ApiError('countCards', error.message)
  return count ?? 0
}
