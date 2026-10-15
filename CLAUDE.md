# Pisada: notes for Claude Code

Personal training & body-log PWA for Pedro. Two screens, switched by the bottom bar in `App.tsx`: **Today** and **Progress**. **PLAN.md** is the build plan (phases, data model, design language): read it first. **docs/COACH.md** is the guide the claude.ai coaching chat uses to read and write the same database.

## How Pedro likes to work

- Pedro is new to software development. Work **step by step**: one step at a time, explain what a command does in plain words, then ask before the next step.
- **Ask** when something is unclear, and **propose better options** with a short reason (he welcomes them).
- He tests on his phone (**Pixel 7, Chrome, Android**) and reports back with screenshots.

## Environment limits (work laptop)

- **No admin rights.** Installers are blocked (e.g. the GitHub CLI `gh` is not available). Don't try to work around IT policy.
- **Pushing to GitHub: Pedro clicks "Push origin" in GitHub Desktop.** Claude commits locally; Pedro pushes.
- Keep projects off the company OneDrive.

## Commands

- `npm run dev`: dev server (launch config `pisada-dev`, http://localhost:5173/pisada/)
- `npm run build`: type-check and build into `dist/`
- `npm run lint`: oxlint (shadcn's `src/components/ui/` is excluded)
- `npm run preview`: serve the production build (launch config `pisada-preview`, port 4173)
- Deploy: push to `main`, then GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to https://pdpb-me.github.io/pisada/

## Stack and structure

Vite 8 + React 19 + TypeScript + Tailwind 4 + shadcn/ui (Radix, style "Nova", neutral base, Geist), Supabase.

- `src/components/`: screens and cards (`today.tsx`, `progress.tsx`, `session-card.tsx`, `log-drawer.tsx`, `exercise-figure.tsx`, `exercise-drawer.tsx`, `test-inputs.tsx`, `move-session.tsx`, `pain-scale.tsx`, `run-log.tsx`, `morning-check.tsx`, `week-strip.tsx`, `login.tsx`)
- `src/components/ui/`: shadcn components (add them with `npx shadcn@latest add <name>`, don't hand-roll; the shadcn MCP server is in `.mcp.json`)
- `src/exercises/`: `rig.ts` + `catalog.ts`, the 8 exercise line figures (typed port of `docs/figures/`; keep pose numbers as they are)
- `src/hooks/`: data loading/saving (`use-day.ts`, `use-week.ts`, `use-progress.ts`, `use-morning-check.ts`, `use-run-steps.ts`, `use-session.ts`)
- `src/lib/`: `supabase.ts` (client), `database.types.ts` (generated), `pain.ts` (5 levels), `pain-areas.ts` (kind → pain question), `tests.ts` (exercise → measured test), `dates.ts`
- `supabase/migrations/`: every schema change, as SQL

## Database (Supabase project `pisada`, ref `swubnxbzjqjeuiwlauwi`)

- Schema changes: write a new file in `supabase/migrations/`, apply it with the Supabase MCP `apply_migration`, **regenerate `src/lib/database.types.ts`** (`generate_typescript_types`), run `get_advisors`, and **update docs/COACH.md** if the change affects how the coaching chat writes data.
- Every table has `user_id default auth.uid()` + RLS "own rows only". Rows inserted via SQL must set `user_id = '8cbe648a-0d47-40f1-9a38-5cb26f37fd24'` (Pedro, the only user).
- The browser uses only the **publishable key** (in `src/lib/supabase.ts`). Never put a secret/service_role key in the repo.
- Login: email OTP. Supabase sends **8-digit** codes (`CODE_LENGTH` in `login.tsx` must match) via custom SMTP (Pedro's Gmail). Sign-ups are **off**.
- Pain: 5 words stored as 0/2/5/8/10 (`src/lib/pain.ts`); the arch is the **right** foot.
- The run ladder lives in `run_steps`. The app **never auto-advances** the step.

## Design rules (see PLAN.md, "Design language")

- shadcn components first; theme tokens in `src/index.css` (`--pain-*`, `--status-*`, one accent `--primary`).
- One thumb: primary actions low on the screen, tap targets ≥ 44 px (`h-11`). Check layouts at 360 px wide.
- Calm, not gamified. Pain colour always comes with its word.
- **Visual references.** Moodboard: `../pisada-moodboard`. Read its `MOODBOARD.md` (screen map) and `CLAUDE.md` before any UI work; open the images in `refs/` for the screen you're changing.

## Testing tips

- Claude can't log in (the code goes to Pedro's email). To see a component, render it temporarily on the login screen, screenshot it at phone width, then `git checkout` the file.
- Test RLS with `execute_sql`: `set local role authenticated` + `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)` inside `begin; … rollback;`.

## Gotchas

- Every PWA on `pdpb-me.github.io` needs its own manifest `"id": "/<repo>/"`. An id of `"./"` resolves to the site root and blocks other apps from installing (this happened with Home Sensing on 14 Oct).
- `public/sw.js` deliberately caches nothing, so updates show on the next app open.
