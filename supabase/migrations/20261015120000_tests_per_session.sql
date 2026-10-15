-- Test results logged from a test session in the app (e.g. heel-raise reps, L and R).
-- plan_session_id links a result to its session; null for results written without one.
-- One value per session, test and side, so a corrected number overwrites the old one.
alter table public.tests
  add column plan_session_id uuid references public.plan_sessions (id) on delete cascade;

create unique index tests_session_test_side on public.tests (plan_session_id, test, side);
