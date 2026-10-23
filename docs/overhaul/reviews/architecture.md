# Architecture review (overhaul, 23 Oct 2026)

Scope: `src/` at `36e24bd`, `vite.config.ts`, the deploy workflow, the migrations, and the parts of `scripts/push-workouts.mjs` that read `plan_sessions`. Checks run: `npm test` (19 pass), `npx tsc -b` (clean), `npm run lint` (clean). Two builds went to scratch folders, not `dist/`. A scratch test file, `/tmp/claude-0/arch/tests/backends.test.ts`, runs the same taps on the Supabase backend (with a fake client that records every call) and on the memory backend. It confirms findings 1, 5 and 12. Ranked by how much each one costs Pedro.

---

## 1. High: writes trust the screen's old copy of the data, and two writes can run at once

`src/data/supabase.ts:252-347`, `src/hooks/use-day.ts:20-30`

`setStatus`, `setPain`, `moveSession` and the "skipped" cleanup decide what to do from the `DaySession` the screen last loaded (`session.activity`, `session.log?.id`, `session.tests.length`). They do not ask the database. Right after a tap, the screen holds the *pending* overlay from `use-day`, which has no log id and no run log. Writes also run in parallel, so they can arrive in any order.

How it fails on the real app (the scratch tests confirm each case):

- **Run: Done, then Skipped** before the reload finishes. Done inserts the run log. Skipped sees `activity: null` and deletes nothing. The skipped run keeps a run log. That log feeds `lastRunStep`, the Ladder card, Progress `runs`, and the next morning's "Was yesterday's run clean?".
- **Run: Done, then Partial.** Each tap inserts a run log. The second one breaks `activities_one_per_plan_session`, and Pedro sees "Not saved: duplicate key…" although the status *was* saved.
- **Pain tapped as the status lands.** `setPain` returns early because there is no `log.id`, and it reports success. The UI disables the scale until the reload (`log-drawer.tsx:117`), so this is mostly hidden. The memory backend saves the pain anyway.
- **Morning arch or evening: Mild, then Moderate** (fixing a mis-tap). `saveArch` and `saveEvening` read first, then insert. Both taps read "no answer yet" and both insert. The second one breaks the partial unique index `symptoms_one_per_day_area_timing`. The result is an error toast, and the *first* tap's value is kept.
- **Move right after logging a run.** The run log is moved by the old snapshot's id, so it can stay on the old date.

The demo can't show any of this. `memory.ts` reads its own db every time and has no network delay, so the "Pedro" simulations will pass while the real app fails.

**Fix:**

- **Writes take ids and the intended result, not snapshots.** For example `setStatus(planSessionId, status)`. The backend works from natural keys: the run log by `plan_session_id` (`upsert … ignoreDuplicates` to create it, `delete().eq('plan_session_id')` to remove it); pain via the log found by `plan_session_id`; tests deleted on skip without checking first. Get the log id back from the upsert with `.select('id').single()`, so pain can be saved in the same call.
- **Run writes one after another per key in `store.ts`.** A small promise chain keyed by `planSessionId`, or by `date|area|timing` for check-ins. This fixes both backends the same way and stops the duplicate-key races. `PostgREST` can't target a partial unique index with `on_conflict`, so check-ins also need either this queue or "insert, and on error 23505 update instead".
- **Optional, later:** an additive migration with `set_session_status(p_id, p_status)` as one Postgres function. That makes the change atomic and costs one round-trip instead of 2–5.

## 2. High: one tap on the selected status deletes the whole log

`src/components/log-drawer.tsx:97`

The status buttons are a single-choice `ToggleGroup`, and tapping the selected one turns it off. That sends `onStatus(null)` → `setStatus(null)`. This deletes the `session_logs` row, and with it the comment and pain (cascade), the test results and the run log (step and clean). It is one tap, with no confirmation and no undo. With one thumb and in a hurry, that tap will happen.

**Fix:** ignore `''` in `onValueChange`. Offer "Clear this log" as its own small action, with an undo toast. Also consider keeping the run log's `clean` and `run_step` when a run is switched to skipped and back.

## 3. High: Today stays on yesterday when the app is reopened next morning

`src/components/today.tsx:27,29`

`useToday()` re-renders at midnight and when the app comes back to the front. But `Today` copies it once into `useState(today)` (and `monday` too), so the shown date never follows. Android keeps the PWA in memory, so the morning open shows yesterday: a weekday name instead of "Today", a "Back to today" button, and `isToday` false. As a result **the morning check-in never auto-opens**, and that is the arch measure.

**Fix:** keep `date: string | null`, where `null` means "follow today" (`const shown = date ?? today`). Clear it back to `null` when `today` changes and the user was on the old today. Do the same for `monday`. Add a test for the rule once it is a pure function, `nextShownDate(prevToday, today, shown)`.

## 4. High: failed reads can't be seen, and data from outside never refreshes

`src/data/use-query.ts`; every hook

- `useQuery` returns `error`, but no screen shows it. If the first load fails (offline, mountain hut, tunnel), `data` stays `undefined` forever. Today and Progress show a skeleton that never ends. The check-in cards show the prompt ("How's the arch?"), as if nothing had been answered. Nothing retries.
- Reads run again only after a write *in this app*. The coach's new plan and the 07:00/20:00 watch sync stay invisible until Pedro happens to save something. That's also true when the app is brought back to the front the same day.
- There is no error boundary. One render error from unexpected coach data gives a white screen.

**Fix:** reload stale queries on `visibilitychange` (e.g. after 60 s) and on `online`. Show error states ("Couldn't load. Retry") wherever a skeleton is shown. While a check-in loads, render a placeholder, not the prompt. Wrap each tab in an error boundary. TanStack Query does all of this (`refetchOnWindowFocus`, `retry`, `networkMode`, dedupe, `invalidateQueries`, `onMutate` for optimistic changes). Moving to it is a good choice; see the target architecture below.

## 5. Medium: Progress reads a year of symptoms in one request, and Supabase cuts lists at 1000 rows

`src/data/supabase.ts:167-173`

`progress()` loads every `symptoms` row of the last 364 days, including "during" pain. The 6-month comparison needs all of it. Hosted Supabase returns at most **1000 rows** per request by default, and without `order` the rows that get dropped are arbitrary. Full adherence gives about 3 check-ins a day plus pain during sessions, roughly 1250 rows a year. (The simulator averages 2.3 a day, about 840 a year.) With daily use the trends become silently wrong within a year. The memory backend has no limit, so the demo hides it.

**Fix:** select only what trends use: `.is('session_log_id', null).in('timing', ['next_morning','evening'])`, with `order('date')`. Then either split arch and evening into two queries (each under 1000 rows for 365 days) or add a small `selectAll()` that pages with `.range()`. The weights (one a day) and the 6-month watch window (about 360 rows) are fine for now.

## 6. Medium: many round-trips, and every save reloads every query

Real app, one run day, per open:

| Screen | Requests |
|---|---|
| Today | `day` 1–3 (plan + videos + watch runs), `weekDots` 1, `runSteps` 1, `lastRunStep` 1, `morning` 3, `evening` 1 = **8–10** |
| Another day in the strip | 5–7 (day, morning, evening) |
| Progress | `progress` 5, `nextTest` 1, `weekDots` 1, `runSteps` 1 = **8** (+3 on Activities) |
| One status tap on a run | 2–5 writes (+ `lastRunStep` read), then all 8–10 reads again ≈ **12–15** |
| One morning arch tap | 3 reads (`saveArch` pre-reads `morning()` to find an id), 1 write, then 8–10 reloads ≈ **13** |

In dev, StrictMode doubles the reads (harmless: the first result is thrown away).

**Fix, in order of value:**

1. **Invalidate by table.** Each query names the tables it reads, and each write names the tables it touches. `saveWeight` then reloads only `morning` and `progress`. `runSteps` never reloads, since the app never writes it.
2. Fold `morning` and `evening` into one `checkIns(date)`: one `symptoms` query (`session_log_id is null`), plus yesterday's run, plus the weight. That's 3 requests instead of 4.
3. Drop the pre-read in `saveArch` and `saveEvening` (see 1).
4. Skip the watch-run query in `day()` until a screen shows `watch`. Nothing uses it yet.
5. Show check-in and pain taps immediately (optimistic), not after a write plus a reload. Today the chosen word lights up 0.5–1.5 s late on mobile. That's against "the fastest possible log".

## 7. Medium: the Backend interface is at the right level for reads, but not for writes

`src/data/api.ts`

Screen-shaped reads (`day`, `progress`, `morning`) are good. One call per card lets Supabase join on the server. The writes are where it goes wrong: every rule lives *twice*, once in `supabase.ts` and once in `memory.ts`. These rules are the cascades, what "skipped" clears, run log creation, check-in row shapes (side `R`/`C`, the `context` strings), and pairing watch runs. The copies already differ (finding 1). Other differences:

- `memory.ts` ignores the `check` constraints: weight 30–250 kg, score 0–10, `slot`, `run_step ≥ 1`. The scratch test saves 12 kg.
- `moveSession` in memory throws when the session is gone. The Supabase version silently updates 0 rows. `setComment` with no log silently does nothing in both.
- `pairWatchRuns` is copied into `memory.ts:85-92`, because importing it from `supabase.ts` would pull the Supabase client into the demo.

**Fix:**

- Put the row builders and the rules in one module that doesn't import Supabase, for example `src/data/rules.ts`: `checkInRow`, `runLogRow`, `pairWatchRuns`, and what each status keeps. Both backends use it.
- Make `memory.ts` check the same constraints as the migrations.
- Add **contract tests**: one `describe` per behaviour (skip clears pain and tests, un-log cascades, one run log per session, moves carry pain/tests/run log, one check-in per day+area+timing). Run them against `createMemoryBackend` now, and later against a local Supabase (`supabase start`) the same way.
- Run demo reviews with `?latency=400`, so loading and race problems show up.

## 8. Medium: check-in timing rules

`src/components/morning-check.tsx:46`, `evening-check.tsx:46`

- Pedro often first opens the app after 19:00 (adherence is the weak point). Then **both sheets open at once**: morning has no time limit and evening's rule is met, so two Vaul drawers stack.
- After midnight, the morning sheet auto-opens and asks about "this morning" before the first steps. Logging "How was today?" at 00:30 writes to the new day.

**Fix:** one pure rule in `src/lib/check-ins.ts`, `dueCheckIn(now, morning, evening)`. It returns at most one sheet to open. Morning only from about 04:00 to 14:00. Evening from 19:00, and until about 03:00 it means *yesterday's* evening. Unit-test it around midnight and at 19:00.

## 9. Medium: one concept, several definitions

- **Current ladder step.** There are three: `lastRunStep` (date and `created_at` order, all runs), `LadderCard` (`progress.tsx:255`, last 30 runs, date only), and `runStepFor` (`session-time.ts:44`). None of them shows the step the coach *planned next*. In the "ladder-up" scenario the card says Step 2 while Step 3 is planned. The streak (`progress.tsx:258`) drops to 0 as soon as the latest run's `clean` is still undecided, which is every run evening. Put this in one `ladderStatus(runs, plannedRuns)` in `lib/ladder.ts`.
- **"Bad day".** It's `≥ 5` in `pain-detail.tsx:70,87` but `≥ 2` ("Mild or worse") in the new `lib/factors.ts`. The zone cut-offs are written out separately in `pain.ts:13`, `trends.ts:63`, `pain-detail.tsx:21` (`yPain`), and the zone bar labels. Keep zones and the bad-day rule in `pain.ts`, nowhere else.
- **"Bike 30+ min"** (`pain-detail.tsx:55`) adds up all bike minutes in a day. Two 20-minute commutes count as "a bike ride over 30 min", which isn't what the label says. `factors.ts` has the same pattern with "Bike over 60 min". Say "Bike 60+ min that day", or count single rides.
- **Pain words.** Pedro chooses "Unbearable", but the chart and zone bar say "Worst" (`pain-detail.tsx:100,179`). The tingling words are typed out again instead of using `TINGLING_LEVELS`. A coach-written `hands` score of 8 shows "A lot" with a *red* dot (`painBand`), but tingling has no red band.

## 10. Medium: the demo and the real app share an origin and the PWA scope

Bundles: checked with scratch builds. The demo bundle has no Supabase URL, key or client. The real bundle has no simulator, scenarios or demo bar. The demo's `index.html` has no manifest link, and `sw.js` and the manifest are removed from `dist/demo`. Build order is right (the real build empties `dist/`, then the demo writes `dist/demo/`). That part is sound.

What's left:

- **Shared `localStorage`** (`pdpb-me.github.io`). The demo writes `pisada:morning-asked` and `pisada:evening-asked` with *made-up dates*, into the same keys the real app reads. If Pedro opens the demo in Chrome, the real app's "asked today" flag is overwritten, and the sheet auto-opens a second time. The demo state is about 185 KB, fine for the quota, but it shares that quota with Home Sensing and the Supabase session token. **Fix:** a `prefs` helper that adds the mode to every key (`pisada:` vs `pisada-demo:`), used by both check-ins and the login email.
- **Scope.** `/pisada/demo/` is inside the real manifest's scope `/pisada/` and the real service worker's scope. On Pedro's phone, Android may open demo links *inside the installed Pisada window*. That's harmless (the service worker caches nothing, and the demo bar says "Demo") but confusing. Note it in the PR. Changing the path would need a second repo.

## 11. Medium: what the coaching chat writes (COACH.md)

These all work: free-text `kind` (unknown kinds get no pain question), `null` `run_step` (falls back to the last logged step), unknown exercise slugs and video ids (filtered out), a `reviews` row on a non-Monday (`lte` finds it). Issues:

- **Re-planning by delete + insert** (COACH: "makes a block easy to … replace") cascades away `session_logs`, pain and tests. It also leaves the run logs without their session (`on delete set null`). COACH.md should say: change `date`/`slot` of logged sessions with update, and only delete sessions that have no log.
- `kind = 'Run'` (capital letter) quietly loses the run log and the ladder. Compare `kind` in lowercase.
- `pairWatchRuns` (`supabase.ts:28`) pairs watch runs with run sessions by their order in the day, skipped ones included. With two runs planned, the first one skipped, the watch data lands on the skipped one (scratch test). Pair only sessions that were done or partial. Needed before "runs show their watch data".
- The same exercise slug twice in `exercises` gives a duplicate React `key` (`session-screen.tsx`). Key by index.

## 12. Low: duplicated helpers, dead code, layering

- **Date formatting**, 8 copies: `progress.tsx:30`, `week-strip.tsx:22`, `pain-detail.tsx:25`, `weight-detail.tsx:18`, `activities-list.tsx:35,39`, `today.tsx:136`, `demo-bar.tsx`. Weekday initials appear twice. Move them to `lib/format.ts`.
- **Day differences.** `daysBetween` (`progress.tsx:34`) is copied without rounding in `weight-detail.tsx:45`, so dots across a DST change sit a fraction of a day off. Move it to `dates.ts`, rounded.
- **Ranges and charts.** The `RANGES` list and the range tab bar are copied in `pain-detail.tsx` and `weight-detail.tsx`, along with the back header and the SVG scales (X0/X1 and ticks). Extract `RangeTabs`, `DetailHeader` and `lib/chart.ts` scales.
- **Status.** Colours and words live in `STATUS_BLOCK` (`progress.tsx:24`), `DOT_CLASS` and the identity map `STATUS_WORD` (`week-strip.tsx:7,13`), `StatusMark` (`plan-card.tsx`), `STATUS_ICON` and `STATUSES` (`log-drawer.tsx`). `done || partial` is repeated 4 times. There are two `WeekCard`s that count the same thing. `SLOT_WORD` appears twice, and it calls `pm` "Evening", a different meaning from the Evening check-in.
- **Check-in rows.** The rules for these rows (side, context strings) are copied in both backends (see 7).
- **Layering.** `lib/session-status.ts` and `lib/session-time.ts` import types from `@/hooks/*`, so the pure code depends on the hooks. Hooks re-export data types. Import from `@/data/types`.
- **Dead or unused:** `todayISO` (`dates.ts:12`), `useWeek().reload`, `useDay().error`, `useWatchMonth().error`, `DaySession.watch` and `review()` (both fetched or declared, not shown yet), `ProgressView`'s "sample data" split, and the fallback in `check()` (`supabase.ts:18`, `Array.isArray(null)` is never true).
- **Stale text.** The login comment says "6-digit" (`login.tsx:27`). CLAUDE.md still lists `src/lib/supabase.ts`. `useSession` (signed in) and "session" (a planned session) share a name.
- **Bundle size.** The real bundle is one 756 kB chunk, including the login screen and charts. Low priority, because Pages caching keeps it cheap. Lazy-loading Progress is the obvious split.

---

## Target architecture

**Layers (each only imports the ones above it):**

1. `src/lib/`, **pure domain, no React and no I/O.**
   - `dates`, `format`, and `pain`/`tingling` (levels, bands, zones, bad-day rule).
   - `session-status` (status table, `countsAsDone`, `weekSummary(dots)`).
   - `ladder` (`ladderStatus`), `trends`, `factors`, `weight`.
   - `check-ins` (`dueCheckIn`, which day an evening belongs to).
   - `today` (`nextShownDate`).
   - All derived numbers on Progress (verdicts, correlations, streaks, chart scales) live here and take plain rows. Components never compute them inline.
2. `src/data/`.
   - `types.ts` and `rules.ts` (row builders, what a status keeps, `pairWatchRuns`, shared by both backends and the simulator).
   - `api.ts`, with screen-shaped reads (`today(date)` = sessions + check-ins + week dots; `progress(today)`) and **intent writes by id and natural key**.
   - `supabase.ts` and `memory.ts` stay thin.
   - `store.ts` adds: one-at-a-time writes per key, table tags for invalidation, optimistic patches. A practical option is TanStack Query (keys `['day', date]`, `['progress', today]`; `invalidateQueries` by table tag; `onMutate`/`onError` for optimistic taps; refetch on focus and when back online).
3. `src/hooks/`, thin adapters that return `{ data, error, loading, retry }` plus what `lib` derives.
4. `src/components/`, rendering only. Every data card has loading, empty and error states. One error boundary per tab.

**Tests to add** (vitest is set up):

- `dates`: `daysBetween` across 25 Oct and 29 Mar, `mondaysOf`, `shiftMonth`.
- `check-ins`: 23:59, 00:30, 04:00 and 19:00, morning plus evening on the same open.
- `nextShownDate`.
- `ladderStatus`: an undecided latest run, a planned step above the last run.
- `pairWatchRuns`: a skipped run, two runs in one day.
- Pain and tingling bands for coach-written scores (3, 7, 8 for hands).
- `weekSummary`.
- `factors`: daily totals vs single rides.
- `weightChange` at range edges.
- **Contract tests for the Backend**, run against memory now and against a local Supabase later. Include the race sequences from finding 1, sent in parallel.
- Simulator invariants, plus "the snapshot passes the database constraints" (kg, score, slot, step).
