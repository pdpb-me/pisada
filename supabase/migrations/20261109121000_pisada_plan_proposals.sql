-- What the coach proposes in the chat. Nothing changes until Pedro taps Apply, which calls
-- decide_proposal with his own login: Row Level Security applies, and it's all or nothing.

create table public.plan_proposals (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid references public.chat_threads on delete set null,
  summary    text not null,
  lines      text[] not null, -- what the card shows, one change per line
  changes    json not null, -- each with how the row was, to see if it changed in the meantime
  status     text not null default 'pending' check (status in ('pending', 'applied', 'declined', 'stale', 'replaced')),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index on public.plan_proposals (user_id, created_at);
create index on public.plan_proposals (thread_id);

alter table public.plan_proposals enable row level security;
revoke all on public.plan_proposals from public, anon, authenticated;
create policy "Own rows only" on public.plan_proposals for select to authenticated using (user_id = (select auth.uid()));
create policy "Own rows only, to decide" on public.plan_proposals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.plan_proposals to authenticated;
grant update (status, decided_at) on public.plan_proposals to authenticated;
grant select, insert, update on public.plan_proposals to service_role;

-- Answers with the proposal's status. If anything it would touch changed since it was proposed,
-- nothing is applied and the status is 'stale'. The changes are written by
-- supabase/functions/_shared/coach.ts (prepareProposal): keep the two in step.
create function public.decide_proposal(p_id uuid, p_apply boolean)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal public.plan_proposals%rowtype;
  change json;
  was json;
  next json;
  session public.plan_sessions%rowtype;
  note public.reviews%rowtype;
  fresh boolean := true;
begin
  select * into proposal from public.plan_proposals where id = p_id for update;
  if not found then raise exception 'Proposal not found'; end if;
  if proposal.status <> 'pending' then return proposal.status; end if;

  if not p_apply then
    update public.plan_proposals set status = 'declined', decided_at = now() where id = p_id;
    return 'declined';
  end if;

  -- First check everything, so that it's all or nothing
  for change in select * from json_array_elements(proposal.changes) loop
    was := change -> 'before';
    next := change -> 'after';

    if change ->> 'op' in ('change', 'remove') then
      select * into session from public.plan_sessions where id = (change ->> 'session_id')::uuid for update;
      if not found
        or jsonb_build_object(
             'date', session.date, 'slot', session.slot, 'kind', session.kind,
             'title', session.title, 'instructions', session.instructions,
             'exercises', session.exercises, 'video_ids', session.video_ids, 'run_step', session.run_step
           ) <> was::jsonb
        or (change ->> 'op' = 'remove' and exists (select 1 from public.session_logs l where l.plan_session_id = session.id))
        -- he logged it (or changed its log) after the coach proposed: the coach didn't know
        or exists (select 1 from public.session_logs l where l.plan_session_id = session.id and l.logged_at > proposal.created_at)
      then
        fresh := false;
      end if;
    end if;

    if change ->> 'op' in ('change', 'add') then
      -- a video or a ladder step that is no longer there
      if exists (
           select 1 from json_array_elements_text(next -> 'video_ids') v(yt_id)
           where not exists (select 1 from public.videos g where g.yt_id = v.yt_id)
         )
        or ((next ->> 'run_step') is not null
            and not exists (select 1 from public.run_steps r where r.step = (next ->> 'run_step')::integer))
      then
        fresh := false;
      end if;
    end if;

    if change ->> 'op' = 'note' then
      select * into note from public.reviews where week_start = (next ->> 'week_start')::date;
      if (case when found then jsonb_build_object('summary', note.summary, 'decisions', note.decisions) else 'null'::jsonb end) <> was::jsonb then
        fresh := false;
      end if;
    end if;

    if not fresh then
      update public.plan_proposals set status = 'stale', decided_at = now() where id = p_id;
      return 'stale';
    end if;
  end loop;

  for change in select * from json_array_elements(proposal.changes) loop
    next := change -> 'after';

    if change ->> 'op' = 'change' then
      update public.plan_sessions set
        date = (next ->> 'date')::date,
        slot = next ->> 'slot',
        kind = next ->> 'kind',
        title = next ->> 'title',
        instructions = next ->> 'instructions',
        exercises = array(select json_array_elements_text(next -> 'exercises')),
        video_ids = array(select json_array_elements_text(next -> 'video_ids')),
        run_step = (next ->> 'run_step')::integer
      where id = (change ->> 'session_id')::uuid;
      -- what he logged moves with the session, as when he moves it himself in the app
      update public.symptoms set date = (next ->> 'date')::date
        where session_log_id in (select l.id from public.session_logs l where l.plan_session_id = (change ->> 'session_id')::uuid);
      update public.activities set date = (next ->> 'date')::date where plan_session_id = (change ->> 'session_id')::uuid;
      update public.tests set date = (next ->> 'date')::date where plan_session_id = (change ->> 'session_id')::uuid;

    elsif change ->> 'op' = 'add' then
      insert into public.plan_sessions (date, slot, kind, title, instructions, exercises, video_ids, run_step)
      values (
        (next ->> 'date')::date, next ->> 'slot', next ->> 'kind', next ->> 'title', next ->> 'instructions',
        array(select json_array_elements_text(next -> 'exercises')),
        array(select json_array_elements_text(next -> 'video_ids')),
        (next ->> 'run_step')::integer
      );

    elsif change ->> 'op' = 'remove' then
      delete from public.plan_sessions where id = (change ->> 'session_id')::uuid;

    elsif change ->> 'op' = 'note' then
      insert into public.reviews (week_start, summary, decisions)
      values ((next ->> 'week_start')::date, next ->> 'summary', next ->> 'decisions')
      on conflict (user_id, week_start) do update set summary = excluded.summary, decisions = excluded.decisions;

    else
      raise exception 'Unknown change: %', change ->> 'op';
    end if;
  end loop;

  update public.plan_proposals set status = 'applied', decided_at = now() where id = p_id;
  return 'applied';
end
$$;

revoke all on function public.decide_proposal(uuid, boolean) from public, anon;
grant execute on function public.decide_proposal(uuid, boolean) to authenticated;
