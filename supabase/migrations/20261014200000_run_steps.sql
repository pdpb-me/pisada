-- Run-walk return-to-running ladder (from the Month 2 plan).
-- Steps live here, not in the app code: the coaching chat adds steps 6+
-- through the Supabase connector. The app never auto-advances: progression
-- is decided at the weekly check-in.

create table public.run_steps (
  id            uuid primary key default gen_random_uuid(),
  step          smallint not null check (step >= 1),
  label         text not null,              -- e.g. 6 × (2' jog / 2' walk)
  reps          smallint not null check (reps >= 1),
  run_min       numeric not null check (run_min > 0),
  walk_min      numeric not null check (walk_min >= 0),
  total_run_min numeric not null check (total_run_min > 0),
  warmup_min    numeric not null default 5, -- walk
  cooldown_min  numeric not null default 3, -- walk
  block         text,                       -- e.g. '2026-10 month2'
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, step)
);

alter table public.run_steps enable row level security;
revoke all on public.run_steps from anon;
grant select, insert, update, delete on public.run_steps to authenticated;
create policy "Own rows only" on public.run_steps for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- One run log per planned session, so re-logging updates it
alter table public.activities
  add constraint activities_one_per_plan_session unique (plan_session_id);
drop index if exists public.activities_plan_session_id_idx;
