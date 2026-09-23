create table lesson_log.course_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table lesson_log.course_members (
  course_id uuid not null references lesson_log.course_courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'learner')),
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

create table lesson_log.course_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references lesson_log.course_courses (id) on delete cascade,
  slug text not null,
  kind text not null check (kind in ('lesson', 'reference', 'week')),
  position integer not null default 0,
  title text not null,
  subtitle text null,
  week_start date null,
  body jsonb not null default '[]'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table lesson_log.course_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references lesson_log.course_items (id) on delete cascade,
  block_id text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id, block_id)
);

alter table lesson_log.cards add column first_review_at timestamptz null;

create index course_members_user_idx on lesson_log.course_members (user_id);
create index course_items_course_idx on lesson_log.course_items (course_id, kind, position);
create index course_progress_item_idx on lesson_log.course_progress (user_id, item_id);
create index cards_user_first_review_idx on lesson_log.cards (user_id, first_review_at);

-- security definer: policies on course_* would otherwise recurse through course_members' own RLS
create function lesson_log.is_course_member(course uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select 1 from lesson_log.course_members m
      where m.course_id = course and m.user_id = auth.uid()
    )
  $$;

revoke all on function lesson_log.is_course_member(uuid) from public;
grant execute on function lesson_log.is_course_member(uuid) to authenticated;

grant select on lesson_log.course_courses, lesson_log.course_members, lesson_log.course_items to authenticated;
grant all on lesson_log.course_progress to authenticated;
grant all on lesson_log.course_courses, lesson_log.course_members, lesson_log.course_items, lesson_log.course_progress to service_role;
revoke insert, update, delete on lesson_log.course_courses, lesson_log.course_members, lesson_log.course_items from authenticated;

alter table lesson_log.course_courses enable row level security;
alter table lesson_log.course_members enable row level security;
alter table lesson_log.course_items enable row level security;
alter table lesson_log.course_progress enable row level security;

create policy "course_courses_select_member" on lesson_log.course_courses
  for select to authenticated using (lesson_log.is_course_member(id));

create policy "course_members_select_own" on lesson_log.course_members
  for select to authenticated using (user_id = auth.uid());

create policy "course_items_select_member" on lesson_log.course_items
  for select to authenticated using (lesson_log.is_course_member(course_id));

create policy "course_progress_select_own" on lesson_log.course_progress
  for select to authenticated using (user_id = auth.uid());
create policy "course_progress_insert_own" on lesson_log.course_progress
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from lesson_log.course_items i where i.id = item_id and lesson_log.is_course_member(i.course_id))
  );
create policy "course_progress_update_own" on lesson_log.course_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "course_progress_delete_own" on lesson_log.course_progress
  for delete to authenticated using (user_id = auth.uid());
