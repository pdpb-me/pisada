# Overhaul findings

Merged from six reviews of the "before" demo (23 Oct 2026): three "Pedro" users (A: hurried
weekdays, B: bad body days, C: plans change) and a "Coach" on Sonnet, a design critic and an
architecture critic on Opus. The full reports are in [`reviews/`](reviews/). Screens before the
overhaul: [`screens/before/`](screens/before/).

Severity: **B** blocker · **H** high · **M** medium · **L** low. Sources: A, B, C (Pedros), Co (Coach),
D (design), Ar (architecture). The **Decision** column says what this overhaul does.

## Ranked

| # | Sev | What | Where | Seen by | Decision |
|---|---|---|---|---|---|
| 1 | H | Logging a session takes 5–8 taps over 3 screens (neck micro-dose: row → session → Log → Done → Save → Back). Adherence is the weak point. | Today, session screen, log sheet | A, B, C, D | **Build.** One-tap Done / Partly / Skip on each unlogged row of Today and past days. On the session screen the three statuses sit in the thumb zone; details (pain, run, test, note) open only when they apply. |
| 2 | H | The coach's weekly note (`reviews`) is shown nowhere. Step changes look like bugs. | whole app | C, Co, D | **Build.** "From your coach" card at the top of Today at the start of the week (then one quiet row), and on Progress. |
| 3 | H | Writes trust the screen's old copy of the data and run in parallel: Done → Skipped leaves a run log on a skipped run; double taps give "duplicate key"; pain tapped right after a status is lost. | `data/supabase.ts`, `use-day.ts` | Ar | **Build.** Writes take ids and work from what the database holds; one write at a time; the same rules module for both backends; contract tests. |
| 4 | H | Tapping the selected status deletes the whole log (pain, test, run log, note). | log sheet | Ar | **Build.** Status buttons can't be un-selected. Clearing a log is a separate action with Undo. |
| 5 | H | Today stays on yesterday when the app is reopened in the morning (Android keeps it in memory). | `today.tsx` | Ar | **Build.** The shown day follows today unless Pedro picked another day. |
| 6 | H | Failed loads are invisible (endless skeleton, check-ins look unanswered); the coach's plan and the watch sync show only after a save in the app. | every screen | Ar, D | **Build.** Error card with "Try again"; reload on app focus and when back online; skeletons that can be seen. |
| 7 | H | Watch data (time, distance, HR, climb) is not on the run or hike it belongs to. | session screen | C, D, brief | **Build.** "From your watch" on logged runs and hikes (app run joined with the synced run, same date). No schema change. |
| 8 | H | Headlines say "Mild · In the OK zone" during a flare; the dashboard (2 weeks) and the detail (4 weeks) disagree. | Progress cards, pain detail | B | **Build.** Lead with the last 7 days and the latest answer; the colour follows the worse of the two; both screens label their window. |
| 9 | H | Two "current ladder steps" (last logged vs planned); "0 clean runs in a row" when the last run is undecided; streak language. | Progress ladder card | B, C, Co, Ar, D | **Build.** One `ladderStatus()`: next planned step, last run (step, clean or "not decided yet"), last runs as small marks. No streak counter. |
| 10 | H | A run with no `run_step` looks planned ("step 5" from the last run), but nothing goes to the watch. | Today row, session screen | Co | **Build.** "Step not set yet" and no workout card. The log still suggests the last step. |
| 11 | H | A Severe morning changes nothing: no calm line on what it means for today. | Today, run screen | B | **Build.** After Moderate or worse: "Arch is sore today. Keep it easy; stop if it goes above Mild. Your coach decides the next run." No automatic plan change (the app never changes the plan). |
| 12 | H | Accent blue does nine jobs; contrast under AA (primary text 4.47, white on green chips 3.30, partial dot 1.87, selected Clean/AM 1.10). | `index.css`, many | D | **Build.** Darker primary, darker pain-low, partial shown by shape, selected = dark fill. Blue only for the main action, done and links. |
| 13 | H | Two check-in sheets open on top of each other at 19:30; the morning sheet asks "this morning" in the evening and on past days. | morning/evening check | A, C, D, Ar | **Build.** No sheets open by themselves any more: the check-ins are cards on Today with the answers inline (one tap each). Which one is due comes from one tested rule (`dueCheckIns`). |
| 14 | H | Heel-raise test: no last result while entering, no better/worse, card not tappable, "Test today" reads like a to-do. | test session, Progress | A, D | **Build.** Left/Right boxes on the test screen itself with last time's numbers; the card shows each side's change and right as % of left; a test history sheet. |
| 15 | M | "Clean?" is asked right after the run and again the next morning, even when answered. | run log, morning check | A | **Build.** Clean is asked once, the next morning (it needs the morning). The run card can still change it. |
| 16 | M | Past days: nothing says yesterday wasn't logged; unlogged past sessions look planned; ~17 taps to catch up a day. | Today | A, C, D | **Build.** A quiet "Yesterday: … not logged · Fill in" row; "Not logged" on past rows; one-tap status on rows; "Skip the rest" for a sick day. |
| 17 | M | "What goes with a bad day" is honest but not plain: no sentence, no runs, no small-numbers note; today's rides aren't synced yet; amber bars read as pain. | pain detail | B, D, Ar | **Build.** Bearable-style list from `lib/factors.ts`: one sentence per factor, small-numbers note, days after the last sync left out, neutral bars. A short version on Progress. |
| 18 | M | Moving a session: 6–8 taps, faint link, native date field without weekdays, faint AM/PM, no "go to day", no warning when two runs land close. | move sheet | C, D | **Build.** "Move" in the header; day chips for the next 7 days plus "Other date"; clear selected state; toast with "Go to day"; calm note if another run is within 48 h. |
| 19 | M | Empty, first-run, gap and late days are bare ("Nothing planned", "Step 1 of 1", "None" from one answer). | Today, Progress | B, C, D | **Build.** Short calm lines for day one, a rest day, after a gap ("Welcome back…"), and no headline word with fewer than 3 answers. |
| 20 | M | One concept, several definitions: bad day (≥5 vs ≥2), "Bike 30+ min" adds a day's rides, "Worst" vs "Unbearable", tingling scored 8 shown red. | `pain-detail.tsx`, `factors.ts` | Ar, B, D | **Build.** Zones, bad-day rule and words live in `lib/pain.ts`; labels say "that day"; "Unbearable" everywhere. |
| 21 | M | Type: 16 sizes, 4 weights; radii drift; hand-rolled cards. | all | D | **Build.** 6-step scale, one gutter (16 px), every card a `Card`. |
| 22 | M | Progress has no headline; six equal cards. | Progress | D | **Build.** A one-sentence headline from the week-vs-week verdicts. |
| 23 | M | Round-trips: 8–10 requests per Today open, ~13 per tap (every save reloads every query). | data layer | Ar | **Build.** Reload only what a write touched; one check-ins read; no pre-read before check-in writes. |
| 24 | M | Progress reads a year of symptoms in one request; Supabase stops at 1000 rows. | `supabase.ts` | Ar | **Build.** Only check-in rows, in pages of 1000. |
| 25 | M | Demo and real app share `localStorage` keys ("asked today" flags). | check-ins | Ar | **Fixed by #13** (the flags are gone); demo keys have their own prefix. |
| 26 | M | COACH.md: `week_start` ambiguous, no `reviews` example, no rule after a break, no weekly-averages query, when to run the check-in, delete+insert re-planning wipes logs, the app-run/watch-run join. | `docs/COACH.md` | Co, Ar | **Build.** COACH.md updated (see the PR). |
| 27 | M | The log sheet saves on tap yet shows a big "Save"; it grows under the thumb; the note placeholder talks about the arch on every session. | log sheet | A, D | **Build.** "Close", a stable layout, a placeholder per kind. |
| 28 | M | After saving, the session screen stays; Back is top-left. | session screen | A | **Build.** One-tap logging from Today makes this rare; after logging on the session screen it returns to the day. |
| 29 | M | Partial looks like done (pale tick) and counts as done. | plan rows, week | A, D | **Build.** Half-filled mark; counts say "done or partly". |
| 30 | M | `kind = 'Run'` (capital) loses the run log; watch run paired with a skipped run; same slug twice breaks a React key. | data, session screen | Ar | **Build.** Kinds compared in lower case; watch runs pair only with runs that happened; keys by index. |
| 31 | M | Toasts at the top cover the title and back arrow; one per tap. | `main.tsx` | B, A, D | **Build.** Bottom, short, only where a tap has no visible result. |
| 32 | L | Week strip arrows are 28 px wide; the "That week" card follows the strip, not the shown day. | `week-strip.tsx`, `today.tsx` | C, D | **Build.** Bigger arrows; the week card leaves Today (Progress has it). |
| 33 | L | Chart: 6 months shown when 2 exist; tiny marks with no legend; violet off-palette; white ground on detail screens. | pain detail | B, D | **Build.** Range starts at the first answer; legend; neutral marks; grey ground with cards. |
| 34 | L | Activities: two commutes look like duplicates; "load" unexplained; no link to how the day felt. | Activities | B | **Build.** Grouped by day, the day's neck/hands next to it, runs show their step. "Load" explained once. |
| 35 | L | Focus ring nearly invisible; tabs without tab semantics; labels as spans. | all | D | **Build.** Visible focus ring; shadcn `Tabs`; fieldset/legend for scales. |
| 36 | L | Exercise flow ends on "Close"; "Stop" safety text is grey. | exercise screen | D | **Build.** "Finish and log" on the last exercise; "Stop" with an icon in the text colour. |
| 37 | L | App icon blue isn't the app blue; toes vanish at launcher size; no monochrome icon. | `public/icons` | D | **Build.** Redrawn icon, the app's blue, a bigger mark, a monochrome version. |
| 38 | L | Decimal comma and point mixed ("1,5′", "72,4" vs "72.8 kg"). | ladder, weight | A, C, D | **Build.** A point everywhere in text; the weight box accepts both. |
| 39 | L | Duplicated helpers (8 date formatters, range tabs, status colours, `lib` importing hooks), dead code, 756 kB single bundle. | all | Ar | **Build.** `lib/format.ts`, shared range tabs and status table, types from `data/types`; Progress loaded lazily. |
| 40 | L | `/pisada/demo/` sits inside the installed app's scope, so Android may open demo links in the Pisada window. | deploy | Ar | **Keep, noted in the PR.** Harmless (the demo says "Demo", nothing is cached); fixing it needs a second repo. |

## Not doing (and why)

- **Bulk "this week was rest" / sickness reason.** One-tap Skip plus "Skip the rest" covers the sick
  week in a few taps; a reason field would be a schema change. The note on a session remains.
- **Automatic plan changes after a bad morning.** The app never changes the plan or the ladder by
  itself (golden rule); it says so in plain words instead.
- **A "plan issues" view for the coach** (unknown slugs, missing steps). COACH.md gets a short
  "check before you tell Pedro" list instead.
- **TanStack Query.** Suggested by the architecture review; the small `useQuery` + table tags does
  what this app needs without a new dependency. Revisit if the app grows.
- **Atomic `set_session_status` database function.** Would need a migration; one-at-a-time writes
  from natural keys fix the races without it.
- **Dark mode, video library, streaks or badges.** Out of scope by the brief.
