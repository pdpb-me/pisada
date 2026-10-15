-- Body weight, logged in the morning check-in (after peeing, before drinking or eating).
-- Optional, a few times a week; one value per day, so re-entering corrects it.
create table public.weights (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  kg         numeric(5, 2) not null check (kg between 30 and 250),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.weights enable row level security;
revoke all on public.weights from anon;
grant select, insert, update, delete on public.weights to authenticated;
create policy "Own rows only" on public.weights for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
