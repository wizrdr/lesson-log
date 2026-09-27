create table lesson_log.level_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

grant select on lesson_log.level_profiles to authenticated;
revoke insert, update, delete on lesson_log.level_profiles from authenticated;
grant all on lesson_log.level_profiles to service_role;

alter table lesson_log.level_profiles enable row level security;

create policy "level_profiles_select_own" on lesson_log.level_profiles
  for select to authenticated using (user_id = auth.uid());
