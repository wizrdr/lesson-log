create schema lesson_log;

grant usage on schema lesson_log to anon, authenticated, service_role;
alter default privileges in schema lesson_log grant all on tables to authenticated, service_role;
alter default privileges in schema lesson_log grant all on sequences to authenticated, service_role;

create type lesson_log.lesson_status as enum ('uploaded', 'transcribing', 'extracting', 'ready', 'failed');
create type lesson_log.entry_type as enum ('correction', 'vocab', 'rule');

create table lesson_log.tutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  language text not null check (language in ('pl', 'en')),
  consent_at timestamptz null,
  created_at timestamptz not null default now()
);

create table lesson_log.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tutor_id uuid not null references lesson_log.tutors (id) on delete restrict,
  date date not null default current_date,
  audio_path text null,
  transcript text null,
  status lesson_log.lesson_status not null default 'uploaded',
  error text null,
  created_at timestamptz not null default now()
);

create table lesson_log.entries (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lesson_log.lessons (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type lesson_log.entry_type not null,
  original text not null,
  corrected text null,
  explanation text null,
  quote text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table lesson_log.cards (
  entry_id uuid primary key references lesson_log.entries (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz null
);

create index tutors_user_idx on lesson_log.tutors (user_id);
create index lessons_user_date_idx on lesson_log.lessons (user_id, date desc);
create index lessons_tutor_idx on lesson_log.lessons (tutor_id);
create index entries_lesson_idx on lesson_log.entries (lesson_id);
create index entries_user_type_idx on lesson_log.entries (user_id, type) where deleted_at is null;
create index cards_user_due_idx on lesson_log.cards (user_id, due);

grant all on all tables in schema lesson_log to authenticated, service_role;

alter table lesson_log.tutors enable row level security;
alter table lesson_log.lessons enable row level security;
alter table lesson_log.entries enable row level security;
alter table lesson_log.cards enable row level security;

create policy "tutors_select_own" on lesson_log.tutors
  for select to authenticated using (user_id = auth.uid());
create policy "tutors_insert_own" on lesson_log.tutors
  for insert to authenticated with check (user_id = auth.uid());
create policy "tutors_update_own" on lesson_log.tutors
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tutors_delete_own" on lesson_log.tutors
  for delete to authenticated using (user_id = auth.uid());

create policy "lessons_select_own" on lesson_log.lessons
  for select to authenticated using (user_id = auth.uid());
create policy "lessons_insert_own" on lesson_log.lessons
  for insert to authenticated with check (user_id = auth.uid());
create policy "lessons_update_own" on lesson_log.lessons
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lessons_delete_own" on lesson_log.lessons
  for delete to authenticated using (user_id = auth.uid());

create policy "entries_select_own" on lesson_log.entries
  for select to authenticated using (user_id = auth.uid());
create policy "entries_insert_own" on lesson_log.entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "entries_update_own" on lesson_log.entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "entries_delete_own" on lesson_log.entries
  for delete to authenticated using (user_id = auth.uid());

create policy "cards_select_own" on lesson_log.cards
  for select to authenticated using (user_id = auth.uid());
create policy "cards_insert_own" on lesson_log.cards
  for insert to authenticated with check (user_id = auth.uid());
create policy "cards_update_own" on lesson_log.cards
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cards_delete_own" on lesson_log.cards
  for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table lesson_log.lessons;

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false);

create policy "audio_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
