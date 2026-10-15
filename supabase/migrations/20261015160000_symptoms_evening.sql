-- Evening check-in ("How was today?"): arch, neck and hand tingling over the whole day.
-- timing 'evening' = how it was today, answered in the evening.
-- Hand tingling is stored as body_area 'hands', context 'tingling', score 0 / 2 / 5 (none / a bit / a lot).
alter table public.symptoms drop constraint symptoms_timing_check;
alter table public.symptoms
  add constraint symptoms_timing_check check (timing in ('during', 'next_morning', 'evening', 'general'));

-- Daily check-ins (no session) hold one answer per day, body area and timing
create unique index symptoms_one_per_day_area_timing
  on public.symptoms (user_id, date, body_area, timing)
  where session_log_id is null;
