alter table lesson_log.entries add column lang text null check (lang in ('pl', 'en'));

create table lesson_log.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_at timestamptz null
);

create index api_keys_user_idx on lesson_log.api_keys (user_id);

grant all on lesson_log.api_keys to authenticated, service_role;

alter table lesson_log.api_keys enable row level security;

create policy "api_keys_select_own" on lesson_log.api_keys
  for select to authenticated using (user_id = auth.uid());
create policy "api_keys_insert_own" on lesson_log.api_keys
  for insert to authenticated with check (user_id = auth.uid());
create policy "api_keys_update_own" on lesson_log.api_keys
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "api_keys_delete_own" on lesson_log.api_keys
  for delete to authenticated using (user_id = auth.uid());
