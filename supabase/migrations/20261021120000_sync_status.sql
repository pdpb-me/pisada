-- When watch activities were last copied from intervals.icu, so Activities can say "Last synced 07:02".
-- One row per user and source. Written by the daily GitHub Action (scripts/sync-intervals.mjs)
-- and by the "Sync now" button (Edge Function sync-intervals).
create table public.sync_status (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  source     text not null default 'intervals',
  synced_at  timestamptz not null default now(),
  count      integer not null default 0 check (count >= 0), -- activities in the last sync
  via        text not null default 'app' check (via in ('app', 'daily')),
  primary key (user_id, source)
);

alter table public.sync_status enable row level security;
revoke all on public.sync_status from anon;
grant select, insert, update on public.sync_status to authenticated;
create policy "Own rows only" on public.sync_status for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
