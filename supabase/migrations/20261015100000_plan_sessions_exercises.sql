-- Exercise figures: which drawn exercises a session shows, in display order.
-- Holds slugs from the catalog in src/exercises/catalog.ts (e.g. 'chin_nod').
-- The catalog lives in code, not in a table; an unknown slug shows nothing.
alter table public.plan_sessions
  add column exercises text[] not null default '{}';
