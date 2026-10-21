# Pisada — personal training & body log

Build plan · drafted 14 Oct 2026

A small web app installable on your phone, backed by Supabase. It does two jobs:
1. **Daily:** shows today's training sessions, lets you log done/partial/skipped, pain scores and comments.
2. **Over time:** keeps your history (training, runs, pain by body area, tests) and shows progress.

Claude also reads and writes the same database through the Supabase connector. So the weekly check-in happens in chat, working from your real data.

---

## Stack

It's the same stack as the thermometer project, plus login.

| Piece | Role | Notes |
|---|---|---|
| **Supabase** | Database, login, API | New project, separate from the thermometer one |
| **GitHub repo** | Code | Can be public: the code isn't sensitive, the data is |
| **Frontend** | Vite + React + TypeScript + Tailwind + [shadcn/ui](https://ui.shadcn.com/) | shadcn needs a build step, so a GitHub Action builds and deploys to Pages |
| **GitHub Pages** | Hosting | Static site, installable on the phone |
| **GitHub Actions** | Scheduled jobs | Daily intervals.icu activity sync (phase 2); weekly sync of new Ash videos (phase 3) |
| **Google Cloud API key** | YouTube Data API | Stored only as a GitHub Actions secret |
| **intervals.icu** | Watch data: Suunto Vertical → intervals.icu (free account, linked 15 Oct) | A daily GitHub Action copies activities into `activities`. API key stored only as a GitHub Actions secret |
| **Cloud Run** | Not needed | — |

### The one new thing versus the thermometer project: privacy

The thermometer dashboard was public. This app holds health data, so:
- **Login is required.** Use a 6-digit code sent by email (Supabase email OTP), for one user (you), and turn sign-ups off after you've registered. *(Changed from magic link on 14 Oct: a code is typed inside the installed app, so it works on every phone.)*
- **Row Level Security is on for every table.** Each row belongs to your user id, and the policies allow only you.
- **The browser only gets the `anon` key.** The `service_role` key never goes into the frontend or the repo.


### Where the data lives, and backups (decided 15 Oct)
- All data is in the Supabase project `pisada` (PostgreSQL, region `eu-west-1`, free plan). The app is only a window onto it: a new or different app can connect to the same database, and any PostgreSQL tool can read it. Watch data is also kept by Suunto and intervals.icu.
- **No automatic backup, no export button** (Pedro's choice). The free plan has no downloadable backups, so the only copy is the live database.
- **Backup on request:** when Pedro asks (e.g. before migrating or leaving the app), export every table (schema from `supabase/migrations/` plus the rows, as JSON or CSV, or a `pg_dump`) to a place **outside the public repo**, and check the row counts match.
- Free projects pause after ~7 days without activity (data kept, restore from the dashboard). Daily use and the daily intervals.icu sync keep it awake.
---

## Design language (DLS)

**Component reference: [shadcn/ui](https://ui.shadcn.com/docs).** Use its components as-is, themed through its CSS variables. Don't hand-roll a component that shadcn already has. Before building any UI, Claude Code should check the shadcn docs (or the shadcn MCP server, if installed) for the right component.

### Principles
1. **Logging takes one thumb and under 10 seconds.** Primary actions sit in the bottom half of the screen, with tap targets ≥ 44 px.
2. **Today first.** The app opens on today. History and progress are one tap away, never in the way.
3. **Calm, not gamified.** No streaks, confetti or guilt for skipped days. A skip is data.
4. **Colour carries meaning only for pain and status.** Everything else stays neutral.
5. **Light only** (Pedro's choice, 21 Oct), even when the phone is in dark mode. The `.dark` colours were removed from `src/index.css`.

### Tokens (set as shadcn theme variables)
| Token | Use |
|---|---|
| Base colour: shadcn **neutral** (or **zinc**) | All surfaces and text |
| `--primary` | One accent only, for the primary action (Done) |
| `--pain-low` (green), 0–3: None, Mild | Matches the "≤3/10 is acceptable" rule |
| `--pain-mid` (amber), 4–6: Moderate | Hold or back off |
| `--pain-high` (red), 7–10: Severe, Unbearable | Stop |
| `--status-done` / `--status-partial` / `--status-skipped` | Week strip dots |
| Font: Geist or Inter, system fallback | One family; differentiate by weight |
| Radius: shadcn default (`0.625rem`) | Keep consistent |
| Spacing: Tailwind 4-pt scale | No custom spacing values |

Pain colours always come with the word, never colour alone.

**Pain is asked as 5 words, not 11 numbers** (decided 14 Oct, like the Bearable app): None, Mild, Moderate, Severe, Unbearable. They are stored as 0, 2, 5, 8, 10 in `symptoms.score`, so the 0–10 bands and the "≤3/10 is acceptable" rule still work for charts and coaching. Arch = right foot.

### Component map
| Screen element | shadcn component |
|---|---|
| App shell + bottom nav (Today · Week · Progress · Library) | custom bar using `Button` (ghost variant) |
| Session card | `Card`: title, instructions, videos; "Log session" button or a grey summary once logged |
| Done / Partial / Skipped | `ToggleGroup` |
| Pain (5 levels) | 5-step `ToggleGroup`, words always shown |
| Log drawer (status, pain, run, comment) | `Drawer` (bottom sheet) with `Textarea` for the comment |
| Morning arch check-in | `Drawer`, opened automatically once |
| Run log (ladder step, clean y/n) | `Select` + `Switch` |
| Week strip | custom row of status dots + `Tooltip` |
| Video links | Small thumbnail of the first video (`AspectRatio`) beside the title, plus `Button` (link variant) per video with duration as a `Badge` |
| Exercise figures | Line-figure SVG (`src/exercises/`): 16:9 thumbnail in `CardAction` + a row per exercise; tap opens a `Drawer` (90% height) with the figure, today's plan, tempo, cues, don'ts, setup |
| Library search/filter | `Command` (search) + `Badge` (tags) |
| Progress charts | shadcn **Charts** (Recharts-based) |
| Confirmations | `Sonner` toast |
| Login | `Card` + `Input` (email) + `InputOTP` (6-digit code) + `Button` |

---

## Data model

The tables are deliberately generic, so that adding neck, a knee, cycling or gym work later means new rows, not new tables.

```
videos            yt_id (pk), title, published_at, duration_s, views,
                  playlists[], tags[], notes, flags, available, synced_at

plan_sessions     id, date, slot (am/pm), kind (tendon|run|stability|mobility|neck|pilates|test|hike),
                  title, video_ids[], exercises[] (figure slugs), instructions, block ('2026-10 month2')

session_logs      id, plan_session_id, status (done|partial|skipped), comment, logged_at

symptoms          id, date, body_area (arch|ankle|knee|neck|…), side (L|R|C),
                  score 0–10, timing (during|next_morning|general), context, session_log_id?

activities        id, date, sport (run|bike|hike|pilates|…), duration_s, distance_m,
                  hr_avg, elevation_m, run_step?, clean?, plan_session_id?,
                  source (manual|suunto_screenshot|intervals), notes
                  + to add for the sync: external_id (intervals.icu id, unique per user),
                    load (intervals training load), raw jsonb (fields not mapped yet)

tests             id, date, test ('sl_heel_raise'), side, value, unit, plan_session_id?

weights           id, date (one per day), kg   ← optional, morning check-in, a few times a week

run_steps         step, label, reps, run_min, walk_min, total_run_min,
                  warmup_min, cooldown_min, block   ← the run-walk ladder; steps 6+ added by the coaching chat

reviews           id, week_start, summary, decisions      ← written by Claude at the weekly check-in
```

Every table also gets `user_id`, which is the column the RLS policies check.

---

## Phases

### Phase 0 · Setup (≈30 min, you plus Claude Code)
- [x] Create a new Supabase project (EU region) → `pisada`, ref `swubnxbzjqjeuiwlauwi`, eu-west-1 (Ireland), free plan. Created 14 Oct
- [x] Create a GitHub repo `pisada` and add this file as `PLAN.md` (local folder: `F:\Passatempo_PB\personal-log`)
- [x] Open the repo in Claude Code and install the Supabase plugin (and the shadcn MCP server, if available) (Supabase connector already on; shadcn MCP in `.mcp.json`)
- [x] Scaffold Vite + React + TS + Tailwind, run `shadcn init`, and apply the DLS tokens (shadcn style "Nova", Radix, neutral, Geist; accent = blue)
- [x] Set up a GitHub Action that builds and deploys to Pages (`.github/workflows/deploy.yml`)
- [x] Connect the **Supabase connector in claude.ai** (Settings → Connectors). This is what lets the coaching chat read your logs. *(Already connected to your account, checked 14 Oct. Make sure it's switched on in the "Pisada do Pedro" project.)*

### Phase 1 · MVP: the daily loop (target: in use by ~22 Oct)
- [x] Schema, RLS policies and email-code login (14 Oct. Codes are 8 digits, sent via Gmail SMTP)
- [ ] **Today** screen: sessions, tappable video links, Done/Partial/Skipped, comment
- [x] Pain inputs: arch during, neck. A one-time morning prompt: "How's the arch this morning?" after a run or tendon day
- [x] Run log: ladder step and clean yes/no (steps in the `run_steps` table; "clean" can also be answered in the next morning's check-in; never auto-advances)
- [x] Week strip showing what's done, skipped and pending (tap a day to open it)
- [x] PWA manifest so it installs on the phone, then deploy to GitHub Pages (footprint icon; service worker caches nothing, so updates show on next open)
- [x] Load the month 2 plan (Claude, through the connector). 76 sessions, 14 Oct → 15 Nov, block `2026-10 month2`, loaded by the claude.ai project using docs/COACH.md

**Phase 1 done 14 Oct 2026.**

### Backlog (found while loading Month 2)
- [x] **Move a session to another date.** Runs float and Pilates moves with the teacher; a "move to date" action on a card keeps the data honest. Done 15 Oct: "Move to another day" at the bottom of the Log drawer
- [x] **Test cards write to `tests`.** `kind = 'test'` should ask for an L/R value (e.g. heel-raise reps) instead of putting the number in a comment. Done 15 Oct: Left/Right boxes in the log
- [ ] **Check video metadata on the phone.** `duration_s` shows as a badge and `flags` show under the link (19 of 21 videos now have durations)

**Until it's live,** keep logging month 2 anywhere (notes app). Don't let the build get in the way of training.

### Phase 2 · Weekly loop
- **Watch data arrives by itself** (decided 15 Oct): Suunto → intervals.icu → daily GitHub Action → Supabase `activities`. No more screenshots.
  - Ruled out: the Suunto Cloud API (company partners only) and the Strava connector (needs paid Strava).
  - intervals.icu: Suunto linked directly (not via Strava), activities + wellness downloaded, history back to mid-July. Planned-workout upload is off: Pisada owns the plan.
  - **Schema:** `activities.external_id` (unique per user, for safe re-runs), `source = 'intervals'`, `load`, `raw jsonb`.
  - **Action:** `GET /api/v1/athlete/{id}/activities?oldest=…&newest=…` with HTTP Basic auth (user `API_KEY`, the key as password); check field names against the API docs. Mapping, roughly: `type`→sport, `start_date_local`→date, `moving_time`→duration_s, `distance`→distance_m, `average_heartrate`→hr_avg, `total_elevation_gain`→elevation_m, `icu_training_load`→load. Upsert on (user_id, external_id) with Pedro's user_id. Rolling window of the last 7 days, so edits in intervals.icu come through; a one-off backfill from 2026-07-15.
  - **Secrets** (GitHub Actions only): `INTERVALS_API_KEY`, `INTERVALS_ATHLETE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PISADA_USER_ID`. The service_role key never goes into the app or the repo.
  - **Watch data vs your taps:** HR, distance and time come from the watch; ladder step, clean y/n and pain stay manual in the app. *Open:* how a run's log (today an `activities` row tied to its session) joins its synced activity: by date, or a link the app fills in.
  - Commutes (bike) are real load; separate them in Pisada if needed (auto-flagging is paid in intervals.icu).
  - *Later, optional:* a `wellness` table (resting HR, HRV, sleep, sleep score) from `/athlete/{id}/wellness`. The Suunto → intervals wellness sync is flaky for some users, so it's nice-to-have.
- Weekly check-in in the claude.ai project: Claude reads the week, including the synced activities.
- Claude writes a `reviews` row and next week's `plan_sessions`.

### Phase 3 · Ash video library
- ✅ Import the 607-video dataset into `videos`, with playlist membership (done 16 Oct, `scripts/videos-to-sql.mjs`).
- ✅ Rough tags from titles (foot, ankle, glute, balance, mobility, neck, warmup, cooldown…). The coach corrects tags and adds notes and safety flags as videos get used.
- Set up a weekly GitHub Action that calls the YouTube API, adds new uploads and refreshes view counts.
- Add a library screen in the app: search, filter by tag, and pick videos for a session.

### Phase 4 · Progress
**Redesign, 15 Oct (Suunto-like):** Progress has two tabs. **Dashboard:** this week (a block per session), three pain cards (arch first steps, neck over the day, hand tingling: word for the last 7 days, trend vs last week, 14 daily bars), heel raises, run ladder. A pain card opens a VO2max-style detail (4W/3M/6M, zone bar, daily chart on its zones, bike/run/tingling days underneath, "what goes with a bad day"). **Activities:** watch data by week. Arch is asked every morning; neck and hands every evening.

**Daily check-ins and trend, 15 Oct:** a morning check-in (arch, first steps) and an evening one ("How was today?": arch, neck, hand tingling over the whole day; neck isn't asked during sessions any more). Progress opens with a **Pain trend** card: each area's last 7 days against the 7 before, in words, plus 28 daily dots. Today shows "This week: x of y done" and the heel-raise test countdown / results.

**First version 15 Oct:** plain tables (no charts yet) on a Progress tab: heel-raise test L/R, pain per day (last 14 days), runs (step, clean), adherence per week. Charts come once there are a few weeks of data.
- Pain by body area over time
- Running volume and ladder step over time
- Adherence (done / planned)
- Test results, left vs right

### Later, only if you'll actually use them
- A tap-the-body pain map
- An in-app "ask Claude about this week" button

---

## Video data: where it lives now, and how it stays alive

**Today:**
- The **xlsx** in the project holds 607 videos and 5 playlists: titles, dates, URLs, lengths and views, a snapshot from 9 Sep. Note it has no descriptions or content.
- The **transcripts** came from vidIQ, which charges credits per video. Only 3 were pulled, and they exist only in chat. What they taught us is captured below.
- The **API key** was used in-session only and not saved, so you'll need to create a key again for the Action.

**Going forward:**
- `videos` becomes the single source of truth. The xlsx was a one-off export.
- The GitHub Action keeps it fresh for free, using the YouTube API quota.
- Content knowledge (what a video actually contains, whether it suits you) goes in the `notes` and `flags` columns. It's added only for videos you use, via vidIQ transcripts or by watching. Don't bulk-pull 607 transcripts: it costs credits, and you'd use maybe 30 of them.

### Annotations so far (seed these into `videos`)

| yt_id | Title | Note | Flag |
|---|---|---|---|
| CMD0zoHT1AI | Stop Over-Pronation | Toe yoga, single-leg big-toe drive with leg sweeps, heel-raised holds, wall drive. Anchor video for the arch | — |
| NFGlJXeJQ-U | Targeted Tibialis Strength | Trains tibialis **anterior**, not posterior. The last drill (outer→inner foot roll under load) is useful | Not a PTT video |
| uscW0kRiY4w | Release Tension: Neck & Shoulder | T-position/cactus and thread-the-needle are good | **Neck:** skip the hand pressure on the head and the hands-behind-head press; don't look up at the end of the rotation |

---

## Who does what

| Where | What |
|---|---|
| **Claude Code** (repo) | Builds the app: schema, frontend, deploys, the GitHub Action |
| **claude.ai project "Pisada do Pedro"** (with the Supabase connector) | Coaching: weekly check-ins, plan changes, program design, reading your data |
