-- When a planned session or a weekly note was last made or changed. The coach in the app is
-- told which days changed outside its chat since its last message (changesSince in
-- supabase/functions/_shared/coach.ts), so it reads them again instead of answering from an
-- old look-up. Set by the database: nobody writes this column.

alter table public.plan_sessions add column updated_at timestamptz not null default now();
alter table public.reviews add column updated_at timestamptz not null default now();

-- Rows from before: last changed when they were made, as far as anyone knows
update public.plan_sessions set updated_at = created_at;
update public.reviews set updated_at = created_at;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Only the triggers below use it
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger plan_sessions_touch before update on public.plan_sessions
  for each row execute function public.touch_updated_at();
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();
