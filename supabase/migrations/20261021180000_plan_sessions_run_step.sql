-- The planned ladder step of a run, set by the coaching chat at the weekly check-in
-- (never by the app or the sync). Null = not decided yet, so the run isn't pushed to
-- the watch. scripts/push-workouts.mjs sends runs with a step to intervals.icu → Suunto.
-- The run log (activities.run_step) still records the step actually run.

alter table public.plan_sessions
  add column run_step smallint check (run_step >= 1);

-- The first two runs of the Month 2 block, already set up by hand in intervals.icu
update public.plan_sessions set run_step = 1
where kind = 'run'
  and id in ('0db74fa7-0a33-495a-b6bc-6a553e50a354', '654670a8-f23b-4ee5-916e-fafa1a082963');
