import type { Block } from '../../supabase/functions/_shared/course-input.ts'
import type { CardInput } from '../../supabase/functions/_shared/cards-input.ts'
import { ApiError, check, client, currentUserId, functionErrorMessage, unwrap } from './client'
import type { CourseItemKind, CourseItemRow, CourseProgressRow } from './types'

export type { Block }

export interface CourseListItem {
  id: string
  slug: string
  kind: CourseItemKind
  position: number
  title: string
  subtitle: string | null
  week_start: string | null
}

export interface CourseItem extends CourseListItem {
  body: Block[]
  cards: CardInput[]
}

export type BlockState = Record<string, unknown>
export type ProgressMap = Record<string, BlockState>

export async function listCourseItems(): Promise<CourseListItem[]> {
  const result = await client()
    .from('course_items')
    .select('id, slug, kind, position, title, subtitle, week_start')
    .order('kind')
    .order('position')
  return unwrap<CourseListItem[]>(result, 'loadCourse')
}

export async function getCourseItem(slug: string): Promise<CourseItem> {
  const result = await client().from('course_items').select('*').eq('slug', slug).single<CourseItemRow>()
  const row = unwrap(result, 'loadCourse')
  return { ...row, body: row.body as Block[], cards: row.cards as CardInput[] }
}

export async function loadProgress(itemId: string): Promise<ProgressMap> {
  const result = await client().from('course_progress').select('block_id, state').eq('item_id', itemId)
  const rows = unwrap<Pick<CourseProgressRow, 'block_id' | 'state'>[]>(result, 'loadProgress')
  return Object.fromEntries(rows.map((r) => [r.block_id, r.state]))
}

export async function saveProgress(itemId: string, blockId: string, state: BlockState): Promise<void> {
  const userId = await currentUserId()
  const result = await client()
    .from('course_progress')
    .upsert({ user_id: userId, item_id: itemId, block_id: blockId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id,item_id,block_id' })
  check(result, 'saveProgress')
}

export interface ImportResult {
  created: number
  skipped: number
}

// ll-cards dedups by type + original on the server, so repeated imports are safe.
export async function importCards(cards: CardInput[]): Promise<ImportResult> {
  if (cards.length === 0) return { created: 0, skipped: 0 }
  const { data, error } = await client().functions.invoke<{ created: unknown[]; skipped: unknown[] }>('ll-cards', { body: { cards } })
  if (error) throw new ApiError('importCards', await functionErrorMessage(error))
  return { created: data?.created.length ?? 0, skipped: data?.skipped.length ?? 0 }
}
