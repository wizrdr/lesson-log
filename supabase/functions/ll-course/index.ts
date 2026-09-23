import { type Db, authenticate, orThrow, serviceClient } from '../_shared/auth.ts'
import { type CourseBody, parseCourseBody } from '../_shared/course-input.ts'
import { corsHeaders, json, readJson } from '../_shared/http.ts'

type Course = { id: string; owner_id: string }
type Outcome = { status: number; body: unknown }

async function findCourse(db: Db, slug: string): Promise<Course | null> {
  return orThrow(
    await db.from('course_courses').select('id, owner_id').eq('slug', slug).maybeSingle<Course>(),
    'course lookup failed',
  )
}

async function ensureOwnedCourse(db: Db, userId: string, course: CourseBody['course']): Promise<Course | Outcome> {
  const existing = await findCourse(db, course.slug)
  if (existing) return existing.owner_id === userId ? existing : { status: 403, body: { error: 'only the course owner can publish' } }
  const created = orThrow(
    await db.from('course_courses').insert({ slug: course.slug, title: course.title, owner_id: userId }).select('id, owner_id').single<Course>(),
    'course insert failed',
  )
  if (!created) throw new Error('course insert returned no row')
  orThrow(await db.from('course_members').insert({ course_id: created.id, user_id: userId, role: 'owner' }), 'owner member insert failed')
  return created
}

async function publish(db: Db, userId: string, body: CourseBody): Promise<Outcome> {
  const course = await ensureOwnedCourse(db, userId, body.course)
  if ('status' in course) return course
  orThrow(await db.from('course_courses').update({ title: body.course.title }).eq('id', course.id), 'course update failed')
  const now = new Date().toISOString()
  const rows = body.items.map((item) => ({ ...item, course_id: course.id, updated_at: now }))
  const saved = orThrow(
    await db.from('course_items').upsert(rows, { onConflict: 'course_id,slug' }).select('slug'),
    'items upsert failed',
  ) as { slug: string }[]
  return { status: 200, body: { course: body.course.slug, published: saved.map((r) => r.slug) } }
}

async function userIdByEmail(db: Db, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`user lookup failed: ${error.message}`)
    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) return found.id
    if (data.users.length < 200) return null
  }
  return null
}

async function addMember(db: Db, userId: string, raw: Record<string, unknown>): Promise<Outcome> {
  const slug = (raw.course as { slug?: unknown } | undefined)?.slug
  const member = raw.member as { email?: unknown } | undefined
  if (typeof slug !== 'string' || typeof member?.email !== 'string') return { status: 400, body: { error: 'course.slug and member.email are required' } }
  const course = await findCourse(db, slug)
  if (!course) return { status: 404, body: { error: 'course not found' } }
  if (course.owner_id !== userId) return { status: 403, body: { error: 'only the course owner can add members' } }
  const memberId = await userIdByEmail(db, member.email)
  if (!memberId) return { status: 404, body: { error: 'no user with this email; invite them first' } }
  orThrow(
    await db.from('course_members').upsert({ course_id: course.id, user_id: memberId, role: 'learner' }, { onConflict: 'course_id,user_id', ignoreDuplicates: true }),
    'member insert failed',
  )
  return { status: 200, body: { course: slug, member: member.email, role: 'learner' } }
}

async function listItems(db: Db, userId: string, slug: string | null): Promise<Outcome> {
  if (!slug) return { status: 400, body: { error: 'course query parameter is required' } }
  const course = await findCourse(db, slug)
  if (!course || course.owner_id !== userId) return { status: 404, body: { error: 'course not found' } }
  const items = orThrow(
    await db.from('course_items').select('slug, kind, title, updated_at').eq('course_id', course.id).order('position'),
    'items lookup failed',
  )
  return { status: 200, body: { course: slug, items } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'GET' && req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const db = serviceClient()
  try {
    const userId = await authenticate(db, req)
    if (!userId) return json(req, 401, { error: 'unauthorized' })

    let outcome: Outcome
    if (req.method === 'GET') {
      outcome = await listItems(db, userId, new URL(req.url).searchParams.get('course'))
    } else {
      const raw = await readJson(req)
      if (raw.member !== undefined) {
        outcome = await addMember(db, userId, raw)
      } else {
        const parsed = parseCourseBody(raw)
        outcome = parsed.ok ? await publish(db, userId, parsed.value) : { status: 400, body: { error: parsed.error } }
      }
    }
    return json(req, outcome.status, outcome.body)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('ll-course', message)
    return json(req, 500, { error: message })
  }
})
