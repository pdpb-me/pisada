-- The evening check-in, sharper (Nov 2026): hand tingling is asked as how much of the day,
-- which hand, and what it came with; the neck too can say what it came with.

-- Which hand: L, R or B (both). The neck keeps C (centre).
alter table public.symptoms drop constraint symptoms_side_check;
alter table public.symptoms
  add constraint symptoms_side_check check (side in ('L', 'R', 'C', 'B'));

-- The hands rows written so far say C, which means nothing for hands: the hand was never
-- asked. Empty says that plainly. (Only check-in rows: no session asks about the hands.)
update public.symptoms set side = null
where body_area = 'hands' and timing = 'evening' and session_log_id is null and side = 'C';

-- What it came with, as Pedro noticed it (never filled in from the watch). Several, or none.
alter table public.symptoms add column triggers text[] not null default '{}';
alter table public.symptoms
  add constraint symptoms_triggers_check check (triggers <@ array['bike', 'desk', 'sleep', 'run', 'other']::text[]);
