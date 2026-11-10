-- What Pedro thought of a video, one tap after a session: keep, easy (too easy), hard
-- (too hard), irritated, drop (don't show again). One row per session and video: a new tap
-- replaces it, tapping the same word again removes it. The coaches read it to choose videos;
-- the app never turns a rating into videos.notes or videos.flags (the claude.ai project does).
create table public.video_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  yt_id           text not null references public.videos (yt_id) on delete cascade,
  -- set null: the rating stays (with its date) if the session is removed from the plan
  plan_session_id uuid references public.plan_sessions (id) on delete set null,
  date            date not null, -- the session's date
  rating          text not null check (rating in ('keep', 'easy', 'hard', 'irritated', 'drop')),
  created_at      timestamptz not null default now(),
  unique (plan_session_id, yt_id)
);
-- the coaches look up a video's ratings
create index video_feedback_yt_id on public.video_feedback (yt_id, date desc);
create index video_feedback_user_id on public.video_feedback (user_id);

alter table public.video_feedback enable row level security;
revoke all on public.video_feedback from anon;
grant select, insert, update, delete on public.video_feedback to authenticated;
create policy "Own rows only" on public.video_feedback for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
