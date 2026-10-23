# Pisada overhaul: brief for the cloud session

Written 23 Oct 2026 in Claude Code, approved by Pedro. This is the brief for one long, autonomous
run that simulates many weeks of use, reviews the app, and rebuilds what needs it. Read
`CLAUDE.md`, `PLAN.md` and `docs/COACH.md` first; this file adds the goal, the rules for this run,
and what "done" means.

**This repo is public.** Never write real health data into it. Everything you generate is made up.

---

## 1. Goal

Make Pisada an app Pedro is proud to show to the Experience Designers he works with (he is a
mechanical engineer at frog), and that fits his real day so well that logging is effortless.

- Pedro has little time. He delegated the whole job: "do everything yourself and tell me when it's
  ready". You decide which features to add, change or remove, based on his use case below.
- The quality bar for UI/UX is a design studio's: clear hierarchy, consistent type and spacing,
  good empty / loading / error states, subtle motion, accessibility, thumb-first layout.
- Calm, not gamified (no streaks, badges, confetti). That rule is binding.

## 2. Who uses it, and how

One user, on a **Pixel 7, Chrome, Android**, installed as a PWA. Europe (CET/CEST).

- **What he's working on:** the **right arch** (a tendon problem; returning to running with a
  run-walk **ladder**, steps in `run_steps`), **neck pain** with **hand tingling** (linked; worse after
  bike commutes, runs and long PC days).
- **His week, from the first 10 days and 3 months of watch data:**
  - A short **neck micro-dose** every morning (planned daily). Adherence is the weak point: about
    4 done, 3 partly, 3 skipped in 10 days. It needs the fastest possible log.
  - **Pilates** about twice a week (pm), **tendon** blocks, **stability** and **mobility** sessions,
    a **run** about twice a week (ladder step 1 now), a **heel-raise test** now and then (the first
    one was skipped), mountain **hikes** on some weekends (a 2-day hut trip happened).
  - **Bike commutes** almost every working day (about 75 rides in 60 days, ~20 min each),
    **strength** sessions on the watch (~40 min), walks.
  - **Morning check-in:** right arch at first steps (+ optional weight, rarely). **Evening
    check-in:** neck and hand tingling over the whole day.
- **The coaching chat** (claude.ai, via the Supabase connector) writes the plan every week and a
  `reviews` row (none written yet). Pedro moves single sessions himself.
- **Watch data** arrives twice a day from intervals.icu (Action `sync-intervals.yml`), and planned
  runs go to the watch the same way (`scripts/push-workouts.mjs`).

## 3. Steps

### 3.1 Demo mode (first, it unlocks everything else)

The app can't be tested without Pedro's email login. Build a **demo mode** that runs the real
screens on **made-up data, with a made-up "today"**, with no login and no network.

- Suggested shape (your call): one small **data layer** that the hooks use instead of calling
  `supabase` directly, with two implementations: Supabase (real) and in-memory (demo). One place
  for "now" (a clock), so demo can set the date and time (also the 19:00 evening check-in).
- Turned on by a build flag (e.g. `VITE_DEMO=1`). The real build must not ship demo data, and the
  demo build must not ship or call Supabase.
- A small control in demo to move the date (e.g. "next day" / jump to a scenario) so a reviewer can
  walk through time. Writes in demo stay in memory (optionally `localStorage`).
- **Gotcha:** the demo must **not** link `manifest.webmanifest` and must **not** register `sw.js`.
  The real app's manifest id is `/pisada/`; a second installable app under `/pisada/demo/` would
  clash (see "Gotchas" in `CLAUDE.md`).

### 3.2 A 12-week simulator

A deterministic generator (seeded) that writes 12 weeks of plausible data in the shape of the real
tables (`src/lib/database.types.ts`): plan blocks written the way `COACH.md` says, logs, comments,
check-ins, tests, weights, watch activities, reviews. Scenarios to cover, at least:

1. An ordinary week; 2. a 2-day mountain trip (hikes, missed routine); 3. a sick week (almost all
skipped); 4. an arch flare-up (Moderate–Severe mornings, a run that isn't clean, ladder drops a
step); 5. ladder going up after 2 clean runs; 6. missed check-ins and late logging (yesterday fixed
today); 7. sessions moved by Pedro; 8. test days with results L/R; 9. a month change and a new
block; 10. a week with heavy bike commuting and worse neck/tingling; 11. day 1 (empty database);
12. a long gap (a holiday without the app).

### 3.3 Simulate and review (use subagents)

| Helper | Model | Job |
|---|---|---|
| 3 × "Pedro" | Sonnet | Use the demo day by day at 360 × 800, each on different scenarios, as Pedro would (one thumb, in a hurry). Write down what is slow, confusing, broken or missing |
| "Coach" | Sonnet | Each simulated week, act as the coaching chat following `COACH.md`: read the week, write next week. Check that what the coach writes shows correctly in the app, and that `COACH.md` is clear |
| Design critic | Opus | Review every screen and state like a senior Experience Designer: hierarchy, type scale, spacing, colour use, states, motion, accessibility (contrast, labels, focus, tap targets ≥ 44 px) |
| Architecture critic | Opus | Data flow, data layer, date/time handling, duplicated logic, loading and error handling, round-trips |

Use a headless browser (e.g. Playwright + Chromium) for screenshots. If a browser can't be
installed here, say so in the PR and review from the code; screenshots will be taken locally later.

Write the merged, ranked list to `docs/overhaul/FINDINGS.md` (severity, what, where, decision).

### 3.4 Build

Decide and build, in small commits grouped by theme. Starting picks (the findings may change them):

- **One-tap logging** for short daily routines (the neck micro-dose) right from Today, with the
  full session screen still one tap away.
- **Runs show their watch data** (time, distance, HR) by joining the app's run log
  (`activities.source = 'manual'`) with the synced run (`source = 'intervals'`, same date). This
  closes the "Open" point in `PLAN.md` Phase 2. Prefer doing it in the app over a schema change.
- **The coach's weekly note** in the app (`reviews`: summary and decisions), where it's seen at
  the start of the week.
- **"What goes with a bad neck day"** in plain words (bike commutes, runs, long days), in the
  spirit of Bearable's correlations. Calm, honest about small numbers.
- **A clearer test day**, so the heel-raise test gets done and its result is easy to read.
- **Polish everywhere:** consistent type and spacing, skeletons, empty / error states, subtle
  transitions, app icon review, accessibility.
- **Not in scope:** the video Library screen (the coach picks videos), anything gamified, dark mode
  (Light only is Pedro's choice), changes to the intervals.icu scripts unless a finding needs it.
- Add a small test setup (e.g. Vitest) for the pure logic in `src/lib/` (dates, trends, ladder,
  weight) if it helps you change things safely.

### 3.5 Verify and hand over

- Re-run the "Pedro" simulation on the new build and confirm the top findings are fixed.
- Screenshots at 360 px, before and after, for the main screens and states, in
  `docs/overhaul/screens/` (made-up data only).
- `npm run lint` and `npm run build` pass.
- **Public demo:** make the deploy workflow also build the demo into `dist/demo/`, so it's served at
  `https://pdpb-me.github.io/pisada/demo/` (approved by Pedro, made-up data only, no login).
- Update `PLAN.md`, `CLAUDE.md` (structure, commands, demo mode) and `docs/COACH.md` where behaviour
  changed. Keep the plain, short English these docs use.
- Open a **Pull Request into `main`** with: a summary in plain words for Pedro, the before/after
  screenshots, the list of decisions (added / changed / removed and why), and anything left open.

## 4. Rules for this run

- **Work on your own branch. Never push to `main` and never merge.** Merging deploys the live app;
  Pedro gives one "OK to push" at the end, after a local review.
- **The real database is off-limits here.** No calls to Supabase from scripts or tests. You have no
  credentials and need none.
- **Schema changes:** avoid them if you can. If one is really needed, write it as a new file in
  `supabase/migrations/` that only **adds** (new tables, new nullable columns); never drops,
  renames or rewrites data. Update `src/lib/database.types.ts` by hand to match, and list it in the
  PR. It will be applied later, locally, with the Supabase connector.
- **The real app's behaviour for saving data** stays compatible with what the coaching chat writes
  (`COACH.md`), so old and new rows keep working.
- shadcn components first (`npx shadcn@latest add <name>`, don't hand-roll); tokens in
  `src/index.css`; one accent colour; pain colour always with its word; tap targets ≥ 44 px; check
  at 360 px wide.
- **Copy:** short, plain English (Pedro is not a native speaker). Calm tone; a skip is data.
- Commit messages: short, plain English, like the existing history.

## 5. Visual references (summary of the private moodboard)

The moodboard repo is private and not available here; this is its screen map in short.

| Screen | Take from |
|---|---|
| Today | Things 3: opens on Today, almost no chrome, generous spacing, secondary info small and grey. PhysiApp: session card with video + dose as chips |
| Log | Bearable: very fast score entry, then optional note. PhysiApp: post-session feedback (done, discomfort, comment) |
| Week | TrainingPeaks: planned vs done per day (take the idea, not the density) |
| Progress | Oura / Apple Health: one number + one status word as the hero, one trend per card, plain-language headline. Bearable: "what makes it worse / better" as a ranked list |
| Overall | Gentler Streak: calm tone about effort and rest. Linear: neutral palette, tight type, small status icons, dense lists that stay readable |
| Not this | Streaks as the hero, badges and awards, social feeds, dense data walls (intervals.icu) |

The current look is Suunto-like: light grey ground, white cards, one blue accent.
