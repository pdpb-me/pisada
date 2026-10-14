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
| **GitHub Actions** | Scheduled jobs | Weekly sync of new Ash videos (phase 3) |
| **Google Cloud API key** | YouTube Data API | Stored only as a GitHub Actions secret |
| **Cloud Run** | Not needed | — |

### The one new thing versus the thermometer project: privacy

The thermometer dashboard was public. This app holds health data, so:
- **Login is required.** Use a 6-digit code sent by email (Supabase email OTP), for one user (you), and turn sign-ups off after you've registered. *(Changed from magic link on 14 Oct: a code is typed inside the installed app, so it works on every phone.)*
- **Row Level Security is on for every table.** Each row belongs to your user id, and the policies allow only you.
- **The browser only gets the `anon` key.** The `service_role` key never goes into the frontend or the repo.

---

## Design language (DLS)

**Component reference: [shadcn/ui](https://ui.shadcn.com/docs).** Use its components as-is, themed through its CSS variables. Don't hand-roll a component that shadcn already has. Before building any UI, Claude Code should check the shadcn docs (or the shadcn MCP server, if installed) for the right component.

### Principles
1. **Logging takes one thumb and under 10 seconds.** Primary actions sit in the bottom half of the screen, with tap targets ≥ 44 px.
2. **Today first.** The app opens on today. History and progress are one tap away, never in the way.
3. **Calm, not gamified.** No streaks, confetti or guilt for skipped days. A skip is data.
4. **Colour carries meaning only for pain and status.** Everything else stays neutral.
5. **Dark and light from day one.** Follow the system setting by default (shadcn supports both out of the box).

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
| Session card | `Card` |
| Done / Partial / Skipped | `ToggleGroup` |
| Pain (5 levels) | 5-step `ToggleGroup`, words always shown |
| Comment | `Textarea` inside a `Drawer` (bottom sheet) |
| Morning arch check-in | `Drawer`, opened automatically once |
| Run log (ladder step, clean y/n) | `Select` + `Switch` |
| Week strip | custom row of status dots + `Tooltip` |
| Video links | `Button` (link variant) with duration as a `Badge` |
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

plan_sessions     id, date, slot (am/pm), kind (tendon|run|stability|mobility|neck|pilates|test),
                  title, video_ids[], instructions, block ('2026-10 month2')

session_logs      id, plan_session_id, status (done|partial|skipped), comment, logged_at

symptoms          id, date, body_area (arch|ankle|knee|neck|…), side (L|R|C),
                  score 0–10, timing (during|next_morning|general), context, session_log_id?

activities        id, date, sport (run|bike|hike|pilates|…), duration_s, distance_m,
                  hr_avg, elevation_m, run_step?, clean?, source (manual|suunto_screenshot), notes

tests             id, date, test ('sl_heel_raise'), side, value, unit

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
- [ ] Run log: ladder step and clean yes/no
- [ ] Week strip showing what's done, skipped and pending
- [ ] PWA manifest so it installs on the phone, then deploy to GitHub Pages
- [ ] Load the month 2 plan (Claude, through the connector)

**Until it's live,** keep logging month 2 anywhere (notes app). Don't let the build get in the way of training.

### Phase 2 · Weekly loop
- Weekly check-in in the claude.ai project. Claude reads the week, and you send Suunto screenshots that Claude turns into `activities` rows.
- Claude writes a `reviews` row and next week's `plan_sessions`.

### Phase 3 · Ash video library
- Import the 607-video dataset into `videos`, and add the playlist membership.
- Add tags (foot, ankle, glute, balance, mobility, neck, pre-run, post-run…) and Claude's notes and safety flags.
- Set up a weekly GitHub Action that calls the YouTube API, adds new uploads and refreshes view counts.
- Add a library screen in the app: search, filter by tag, and pick videos for a session.

### Phase 4 · Progress
- Pain by body area over time
- Running volume and ladder step over time
- Adherence (done / planned)
- Test results, left vs right

### Later, only if you'll actually use them
- Automatic Suunto import through Strava or intervals.icu
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
