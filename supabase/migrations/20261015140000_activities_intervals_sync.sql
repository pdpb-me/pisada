-- Watch data synced from intervals.icu (Suunto → intervals.icu → GitHub Action → here).
-- external_id: the intervals.icu activity id; unique per user so a re-run updates, never duplicates.
-- load: intervals.icu training load (HR-based). raw: the full activity as sent, for fields not mapped yet.
alter table public.activities
  add column external_id text,
  add column load numeric check (load >= 0),
  add column raw jsonb;

alter table public.activities
  add constraint activities_user_external_id unique (user_id, external_id);

alter table public.activities drop constraint activities_source_check;
alter table public.activities
  add constraint activities_source_check check (source in ('manual', 'suunto_screenshot', 'intervals'));
