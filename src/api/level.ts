import type { LevelDoc } from '../../supabase/functions/_shared/level-input.ts'
import { check, client } from './client'
import type { LevelProfileRow } from './types'

export type { LevelDoc }

export async function getLevel(): Promise<LevelDoc | null> {
  const result = await client().from('level_profiles').select('doc').maybeSingle<Pick<LevelProfileRow, 'doc'>>()
  check(result, 'loadLevel')
  return result.data ? (result.data.doc as LevelDoc) : null
}
