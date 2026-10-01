alter table public.assignments
  add column if not exists description text not null default '',
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz,
  add column if not exists max_attempts integer not null default 1
    check (max_attempts >= 1 and max_attempts <= 20);

create table if not exists public.exam_sessions (
  id text primary key,
  assignment_id text not null,
  student_id text not null,
  student_name text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'abandoned')),
  progress integer not null default 0 check (progress >= 0),
  total_items integer not null default 0 check (total_items >= 0),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_sessions_assignment_status_idx
  on public.exam_sessions (assignment_id, status, last_seen_at desc);

alter table public.exam_sessions enable row level security;
grant select, insert, update, delete on public.exam_sessions to anon, authenticated;

drop policy if exists "session visibility for app users" on public.exam_sessions;
create policy "session visibility for app users"
  on public.exam_sessions for select to anon, authenticated using (true);

drop policy if exists "session insert for app users" on public.exam_sessions;
create policy "session insert for app users"
  on public.exam_sessions for insert to anon, authenticated with check (true);

drop policy if exists "session updates for app users" on public.exam_sessions;
create policy "session updates for app users"
  on public.exam_sessions for update to anon, authenticated using (true) with check (true);

drop policy if exists "session delete for app users" on public.exam_sessions;
create policy "session delete for app users"
  on public.exam_sessions for delete to anon, authenticated using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'exam_sessions'
     ) then
    alter publication supabase_realtime add table public.exam_sessions;
  end if;
end
$$;
