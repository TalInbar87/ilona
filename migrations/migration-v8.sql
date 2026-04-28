-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v8
-- 1. Add tools column to treatments
-- 2. Add meetings table (generic calendar events — no patient required)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Treatment tools/aids field
alter table treatments
  add column if not exists tools text;

-- 2. Meetings table
create table if not exists meetings (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  created_by  uuid        references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

alter table meetings enable row level security;

-- Each user manages only their own meetings
create policy "users_manage_own_meetings" on meetings
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());

-- 3. Add next_ideas column to treatments
alter table treatments
  add column if not exists next_ideas text;
