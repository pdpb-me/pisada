# Pisada: notes for Claude Code

Personal training & body-log PWA for Pedro. Two tabs, switched by the bottom bar in `App.tsx`: **Today** (check-ins, the coach's note, the day's plan → a session → an exercise) and **Progress** (Overview | Activities). Look: Suunto-like (light grey ground, white cards, one blue accent); mockups at claude.ai artifacts "Pisada Today redesign" / "Pisada Progress redesign". **PLAN.md** is the build plan (phases, data model, design language): read it first. **docs/COACH.md** is the guide the claude.ai coaching chat uses to read and write the same database.

## How Pedro likes to work

- Pedro is new to software development. Work **step by step**: one step at a time, explain what a command does in plain words, then ask before the next step.
- **Ask** when something is unclear, and **propose better options** with a short reason (he welcomes them).
- He tests on his phone (**Pixel 7, Chrome, Android**) and reports back with screenshots.

## Environment limits (work laptop)

- **No admin rights.** Most installers are blocked. Don't try to work around IT policy.
- **GitHub CLI `gh` is installed** (since 15 Oct), logged in as `pdpb-me`, at `C:\Program Files\GitHub CLI\gh.exe`. A session started before the install may not have it on PATH: call it by that full path.
- **Pushing to GitHub: Claude pushes.** A push changes the live app, so:
  - **Small things: push directly**, no need to ask (Pedro's rule, 15 Oct). Small = notes and docs only (`CLAUDE.md`, `COACH.md`, `PLAN.md`), text or wording fixes, and small bug fixes that don't change how data is saved.
  - **Everything else: ask Pedro "OK to push?" first.** That's new features, database changes (migrations), anything that changes or deletes saved data, and anything he hasn't seen yet. When unsure, ask.
  - After every push, watch the deploy (`gh run list` / `gh run watch`) and tell Pedro when it's live, or what failed.
- Keep projects off the company OneDrive.

## Commands

- `npm run dev`: dev server (launch config `pisada-dev`, http://localhost:5173/pisada/)
- `npm run dev:demo`: the **demo** (made-up data, no login, no Supabase), http://localhost:5173/pisada/demo/
- `npm run build`: type-check, build the app into `dist/` and the demo into `dist/demo/`
- `npm test`: Vitest (pure logic in `src/lib`, the demo's simulator, the backend contract tests)
- `npm run lint`: oxlint (shadcn's `src/components/ui/` is excluded)
- `npm run preview`: serve the production build (launch config `pisada-preview`, port 4173): app at `/pisada/`, demo at `/pisada/demo/`
- `node scripts/demo-shots.mjs <folder>`: screenshots of the demo at 360 × 800 (after `npm run build` + `npm run preview`; needs Playwright)
- Deploy: push to `main`, then GitHub Actions (`.github/workflows/deploy.yml`) lints, tests, builds and publishes to https://pdpb-me.github.io/pisada/ (demo: https://pdpb-me.github.io/pisada/demo/)

## Stack and structure

Vite 8 + React 19 + TypeScript + Tailwind 4 + shadcn/ui (Radix, style "Nova", neutral base, Geist), Supabase.

- `src/components/`: screens and cards.
  - Today: `today.tsx` (header, week strip, notes) → `check-ins.tsx` (morning and evening cards, answers inline), `coach-note.tsx` (the week's `reviews` row), `plan-list.tsx` (rows with one-tap Done / Partly / Skipped) → `session-screen.tsx` (log in the thumb zone, watch data, step, test) → `exercise-screen.tsx`. Sheets: `log-sheet.tsx` (details of a log), `move-sheet.tsx`, `test-card.tsx` (Left/Right + history), `run-ladder.tsx`.
  - Progress: `progress.tsx` (headline, area cards, bad-day factors, test, ladder, weight) → `pain-detail.tsx`, `weight-detail.tsx` (both lazy-loaded), `activities-list.tsx` (by day, with that evening's neck and hands).
  - Shared: `status-mark.tsx`, `pain-scale.tsx` (`PainScale`, `Choice`), `states.tsx` (error card, empty note, skeleton), `screen-header.tsx`, `detail-parts.tsx`, `factors-list.tsx`, `log-summary.tsx`, `week-strip.tsx`, `weight-input.tsx`, `exercise-figure.tsx`, `login.tsx`. Inside a tab, screens stack with `use-screens.ts` (the phone's back gesture goes back one screen).
- `src/components/ui/`: shadcn components (add them with `npx shadcn@latest add <name>`, don't hand-roll; the shadcn MCP server is in `.mcp.json`)
- `src/exercises/`: `rig.ts` + `catalog.ts`, the 8 exercise figures, flat-colour style since 15 Oct (typed port of `docs/figures/`; keep pose numbers as they are; colours are the `--fig-*` tokens in `src/index.css`)
- `src/data/`: **the only way to the data.** `api.ts` (the `Backend` interface: reads and writes in the app's words), `supabase.ts` + `supabase-client.ts` (the real backend), `rules.ts` (row rules shared by both backends: what "skipped" clears, check-in rows, watch pairing, limits), `store.ts` (writes one at a time, reload by table, error toasts), `use-query.ts` (load + reload when a write touches its tables, on app focus and when back online), `types.ts`, `backend.ts` (picks the backend; the demo build swaps it).
- `src/demo/`: the demo. `simulate.ts` (seeded 12 made-up weeks), `scenarios.ts` (moments to jump to), `state.ts` (the in-memory database, kept in localStorage; `window.pisadaDemo` for scripts), `memory.ts` (the in-memory backend), `demo-bar.tsx` (the black strip: move the clock, jump to a scenario), `backend.ts`.
- `src/hooks/`: thin hooks over `src/data` (`use-day.ts`, `use-check-ins.ts`, `use-data.ts` (week dots, steps, review, progress, tests…), `use-watch-month.ts`, `use-pending.ts` (taps show at once), `use-screens.ts`, `use-session.ts`)
- `src/lib/`: pure logic, no React or I/O, with tests (`*.test.ts`). `clock.ts` (the one "now"; the app day starts at 04:00), `dates.ts`, `format.ts` (dates, durations), `check-ins.ts` (which check-in is due), `pain.ts` (5 levels), `pain-areas.ts` (kind → pain question), `tests.ts` (exercise → measured test, test days), `tingling.ts`, `session-status.ts`, `session-words.ts`, `session-time.ts`, `trends.ts` (area summaries, headline), `factors.ts` (what goes with a bad day), `ladder.ts` (ladder status and rules), `weight.ts`, `ranges.ts`, `prefs.ts` (small per-phone settings), `database.types.ts` (generated)
- `supabase/migrations/`: every schema change, as SQL

## Database (Supabase project `pisada`, ref `swubnxbzjqjeuiwlauwi`)

- Schema changes: write a new file in `supabase/migrations/`, apply it with the Supabase MCP `apply_migration`, **regenerate `src/lib/database.types.ts`** (`generate_typescript_types`), run `get_advisors`, and **update docs/COACH.md** if the change affects how the coaching chat writes data.
- Every table has `user_id default auth.uid()` + RLS "own rows only". Rows inserted via SQL must set `user_id = '8cbe648a-0d47-40f1-9a38-5cb26f37fd24'` (Pedro, the only user).
- The browser uses only the **publishable key** (in `src/data/supabase-client.ts`). Never put a secret/service_role key in the repo.
- Login: email OTP. Supabase sends **8-digit** codes (`CODE_LENGTH` in `login.tsx` must match) via custom SMTP (Pedro's Gmail). Sign-ups are **off**.
- Pain: 5 words stored as 0/2/5/8/10 (`src/lib/pain.ts`); the arch is the **right** foot.
- The run ladder lives in `run_steps`. The app **never auto-advances** the step. The planned step is `plan_sessions.run_step` (set by the coaching chat); `scripts/push-workouts.mjs` (in the sync-intervals Action) sends runs with a step to intervals.icu → the Suunto watch.

## Design rules (see PLAN.md, "Design language")

- shadcn components first; theme tokens in `src/index.css` (`--pain-*`, `--status-*`, one accent `--primary`). The shadcn registry may be blocked in a cloud session: `ui/tabs.tsx` was written from the shadcn source on 23 Oct; re-sync it locally with `npx shadcn@latest add tabs --overwrite` when convenient.
- **Blue only for** the main action, "done", and links. Selected non-pain choices are dark (`Choice`). "Partly" is half filled (shape, not a paler colour).
- **Type scale:** `text-xs` 12, `text-sm` 14, `text-base` 16, `text-xl` 20, `text-display` 28 (page titles, card hero numbers), `text-hero` 40 (one number on a detail screen). Page gutter `px-4`, cards `rounded-xl`, buttons `rounded-full`.
- One thumb: primary actions low on the screen, tap targets ≥ 44 px (`h-11`). Check layouts at 360 px wide.
- Calm, not gamified. Pain colour always comes with its word. No sheet opens by itself.
- Every screen that loads has a skeleton, an error card ("Try again") and an empty state.
- **Visual references.** Moodboard: `../pisada-moodboard`. Read its `MOODBOARD.md` (screen map) and `CLAUDE.md` before any UI work; open the images in `refs/` for the screen you're changing.

## Testing tips

- Claude can't log in (the code goes to Pedro's email). **Use the demo:** `npm run dev:demo`, then pick a moment from the black strip (or `?scenario=<id>` in the address; `&bar=0` hides the strip, `&latency=800` slows it down to see loading states). Screenshots: `scripts/demo-shots.mjs`.
- `npm test` before pushing. The backend contract tests (`src/demo/memory.test.ts`) describe what both backends must do.
- Test RLS with `execute_sql`: `set local role authenticated` + `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)` inside `begin; … rollback;`.

## Gotchas

- Every PWA on `pdpb-me.github.io` needs its own manifest `"id": "/<repo>/"`. An id of `"./"` resolves to the site root and blocks other apps from installing (this happened with Home Sensing on 14 Oct).
- `public/sw.js` deliberately caches nothing, so updates show on the next app open.
- **The demo is never installable**: its page has no manifest link and it registers no service worker (see `vite.config.ts`), so it can't clash with the real app. It shares `localStorage` with the real app (same site), so demo keys start with `pisada-demo:` (`src/lib/prefs.ts`). Only made-up data in the demo: the repo is public.
- Real-app code must never import from `src/demo/`, and demo code never from `src/data/supabase*` (the bundles are checked in the PR of 23 Oct; keep it that way).
