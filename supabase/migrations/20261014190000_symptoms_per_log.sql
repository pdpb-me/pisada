-- Pain "during" a session belongs to that session's log:
-- - un-logging a session removes its pain scores too (was: kept, orphaned)
-- - at most one score per log, body area and timing, so re-tapping updates it

alter table public.symptoms
  drop constraint symptoms_session_log_id_fkey,
  add constraint symptoms_session_log_id_fkey
    foreign key (session_log_id) references public.session_logs on delete cascade;

-- NULL session_log_id (e.g. the morning check-in) never conflicts
alter table public.symptoms
  add constraint symptoms_one_per_log_area_timing unique (session_log_id, body_area, timing);

-- The unique constraint's index covers session_log_id lookups
drop index if exists public.symptoms_session_log_id_idx;

comment on column public.symptoms.score is
  '0-10. The app records 5 levels: none=0, mild=2 (<=3 is OK), moderate=5 (4-6 hold), severe=8, unbearable=10 (7+ stop)';
