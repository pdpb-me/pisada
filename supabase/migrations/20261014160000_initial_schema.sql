-- Pisada: initial schema (see PLAN.md, "Data model")
--
-- Every table has user_id, filled in automatically from the logged-in user.
-- Row Level Security (RLS) is on everywhere: a logged-in user can only see and
-- change their own rows, and anonymous visitors can't see anything.
--
-- Free-text columns (kind, body_area, sport, test) are deliberately left open,
-- so adding neck, a knee, cycling or gym work later means new rows, not new tables.

-- Video library (Ash's channel)
create table public.videos (
  yt_id        text primary key,
  title        text not null,
  published_at timestamptz,
  duration_s   integer check (duration_s >= 0),
  views        bigint check (views >= 0),
  playlists    text[] not null default '{}',
  tags         text[] not null default '{}',
  notes        text,
  flags        text,
  available    boolean not null default true,
  synced_at    timestamptz,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);

-- What's planned, per day and slot
create table public.plan_sessions (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  slot         text not null check (slot in ('am', 'pm')),
  kind         text not null, -- tendon | run | stability | mobility | neck | pilates | test | ...
  title        text not null,
  video_ids    text[] not null default '{}',
  instructions text,
  block        text, -- e.g. '2026-10 month2'
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);

-- What actually happened: one log per planned session (logging again updates it)
create table public.session_logs (
  id              uuid primary key default gen_random_uuid(),
  plan_session_id uuid not null unique references public.plan_sessions on delete cascade,
  status          text not null check (status in ('done', 'partial', 'skipped')),
  comment         text,
  logged_at       timestamptz not null default now(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade
);

-- Pain and other symptoms, by body area
create table public.symptoms (
  id             uuid primary key default gen_random_uuid(),
  date           date not null default current_date,
  body_area      text not null, -- arch | ankle | knee | neck | ...
  side           text check (side in ('L', 'R', 'C')),
  score          smallint not null check (score between 0 and 10),
  timing         text not null default 'general' check (timing in ('during', 'next_morning', 'general')),
  context        text,
  session_log_id uuid references public.session_logs on delete set null,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  created_at     timestamptz not null default now()
);

-- Runs, rides, hikes, ...
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  sport           text not null, -- run | bike | hike | pilates | ...
  duration_s      integer check (duration_s >= 0),
  distance_m      integer check (distance_m >= 0),
  hr_avg          smallint check (hr_avg between 20 and 250),
  elevation_m     integer,
  run_step        smallint check (run_step >= 0), -- ladder step
  clean           boolean, -- pain-free run?
  source          text not null default 'manual' check (source in ('manual', 'suunto_screenshot')),
  notes           text,
  plan_session_id uuid references public.plan_sessions on delete set null,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now()
);

-- Strength / mobility tests, e.g. single-leg heel raises
create table public.tests (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  test       text not null, -- e.g. 'sl_heel_raise'
  side       text check (side in ('L', 'R', 'C')),
  value      numeric not null,
  unit       text,
  notes      text,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- Weekly check-in, written by Claude
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null,
  summary    text,
  decisions  text,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Indexes for the common lookups ("this user's rows for this date range")
create index on public.videos (user_id);
create index on public.plan_sessions (user_id, date);
create index on public.session_logs (user_id);
create index on public.symptoms (user_id, date);
create index on public.symptoms (session_log_id);
create index on public.activities (user_id, date);
create index on public.activities (plan_session_id);
create index on public.tests (user_id, date);

-- Security: RLS on, one "own rows only" policy per table,
-- and no access at all for visitors who aren't logged in.
do $$
declare
  t text;
begin
  foreach t in array array['videos', 'plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "Own rows only" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end
$$;
