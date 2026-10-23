# Design review: Pisada "before" build

Reviewer: design critic (senior Experience Designer lens). Base: the 24 "before" screenshots, about 50 more taken live at 360 × 800 (all 13 scenarios, drawers open, `&latency=1500`, keyboard focus, long text inserted through `pisadaDemo.insert`), the code in `src/components/` and the tokens in `src/index.css`. Contrast ratios were computed from the OKLCH tokens (WCAG 2.x).

**Overall.** The bones are good. It is calm, uses words for pain and has no gamification. The figures are lovely, and the session and exercise screens already feel close to PhysiApp. What keeps it from a studio bar is discipline, not ideas. Today has no hero. Blue means nine different things. There are 16 font sizes. Loading and error states are effectively missing. A few contrast values sit just under AA.

---

## Findings (ranked)

### High

**1. Today has no hero, and the daily action is 4 taps deep.** `today.tsx`, `plan-card.tsx`, `session-screen.tsx`, `log-drawer.tsx`
The title, date and week strip take 265 of 800 px (33%) before any content. Logging the neck micro-dose takes these steps: row → session screen → "Log session" → "Done" (in a sheet, at the top) → "Save". Adherence is the weak point, so this is the most important flow in the app.
*Fix:* put an **"Up next"** card first: the first unlogged session of the day, title `text-base font-semibold`, meta `text-sm text-muted-foreground`, and at the bottom of the card a segmented row `Done · Partly · Skip` (`h-11`, full width). One tap saves and shows a toast "Neck micro-dose: done · Add a note · Undo". Tapping the card body still opens the session. Shrink the day pills from `h-16` to `h-14`. Remove the "This week, 6 of 14" card from Today: the strip dots and Progress already say it, and it is the third count on the screen after "0 of 2 done".

**2. The one accent is used for nine jobs.** Several files
Blue fills the selected day, the done status, the check-in prompts ("How's the arch?"), every card icon, "Start: one exercise at a time", links, the Progress tab underline, the 4W/3M/6M segment, chart data (bike marks, weight line) and the ladder bar. So the real primary action ("Log session") has nothing to stand out against.
*Fix:* keep blue for **(a)** the one filled primary button per screen, **(b)** the done status and **(c)** text links. Change the rest:
- selected day: `bg-foreground text-background`
- check-in prompts: `text-foreground` plus a `ChevronRight`
- card icons: `text-muted-foreground`
- Progress tabs: shadcn `Tabs` (white pill on a `bg-muted` track)
- chart marks: `fill-foreground/60`
- ladder bar: `bg-foreground/80`

**3. Contrast fails or sits on the edge.** `src/index.css`

| Pair | Ratio | Where it shows |
|---|---|---|
| `--primary` text on white | **4.47** | "See the whole ladder", "Edit" |
| `--primary` text on the grey ground | **4.06** | "Start: one exercise…" |
| White on `--primary` (16 px button text) | **4.47** | All primary buttons |
| White on `--pain-low` | **3.30** | Selected "None", "Mild", "A bit" chips |
| `--status-partial` on white | **1.87** | Partial dots: done and partial differ only by opacity |
| `--status-skipped` on white | **2.59** | Skipped dots |
| `--pain-mid` on white | **2.14** | Dots and bars, not text |

`--muted-foreground` passes (6.0 on white, 5.45 on grey).
*Fix:*
- `--primary: oklch(0.53 0.16 250)` (#006dc3: 5.25 on white, 4.77 on grey)
- `--pain-low: oklch(0.55 0.15 150)`, about 4.6
- `--status-skipped: oklch(0.6 0 0)` (3.95)
- Show partial by **shape, not opacity**: a half-filled dot (`ring-1 ring-status-done` + `bg-[linear-gradient(90deg,var(--status-done)_50%,transparent_50%)]`), and the `CircleDashed` icon at full blue.

**4. Loading states are invisible and the layout jumps.** `ui/skeleton.tsx`, `today.tsx`, `progress.tsx`, `activities-list.tsx`
`Skeleton` uses `bg-muted`, which is the **same OKLCH as `--background`**, so on the grey ground it can't be seen. At `latency=1500`, Today shows the two check-in cards in mid-screen and then the plan card pushes them down. Progress and Activities are blank grey.
*Fix:* draw skeletons as white `Card` shapes with `bg-foreground/[0.06]` bars inside. Reserve the plan card's height (2 rows ≈ 176 px). Mirror the Progress grid (one `h-36` card and four `h-52` cards) and give Activities 6 placeholder rows. Show skeletons only after 150 ms.

**5. There are no error states.** `today.tsx`, `data/store.ts`
`useDay` returns `error`, but Today ignores it, so a failed load shows an endless (invisible) skeleton. A failed save shows a raw toast: "Not saved: TypeError: Failed to fetch".
*Fix:* add an inline card: "Couldn't load this day. Check your connection." with an outline button "Try again" (`h-11`). Toast copy: "Not saved. Check your connection and try again." with a **Retry** action.

**6. Two sheets stack when the app opens in the evening.** `morning-check.tsx`, `evening-check.tsx`
In the "ordinary" scenario at 19:30, the morning and evening sheets both open by themselves, one on top of the other, with a double overlay.
*Fix:* open **at most one sheet per app open**: morning before 14:00, evening from 19:00. If the morning check is still empty in the evening, its card says "Missed this morning" and doesn't open by itself.

**7. The log sheet's model is unclear and the sheet jumps.** `log-drawer.tsx`
Taps save straight away, yet a filled "Save" button sits there before anything is chosen. Tapping "Done" makes the sheet grow (the pain question and comment appear under the thumb). The comment placeholder talks about the arch even on the neck session.
*Fix:* show every field from the start, with pain disabled until a status is picked. Rename the footer button "Close". Collapse the comment into a link "Add a note". Give each kind its own placeholder: "e.g. right side tight on the T-hold". Status words: "Done · Partly · Skipped", to match the week card's "partly".

**8. Selected states are hard to see.** `run-log.tsx` (`CleanToggle`), `move-session.tsx`
A selected "Clean" is `bg-muted` on white, a contrast of 1.10 (see screenshot 05). AM/PM is the same.
*Fix:* selected = `bg-foreground text-background` with a 16 px `Check` icon. Use the same rule for every non-pain toggle.

### Medium

**9. The type scale has 16 sizes and 4 weights.** Used today: 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30 and 34 px, in weights 400, 500, 600 and 700.
- Card titles: 15 (`CheckCard`), 16 (pain cards), 17 (week card), 18 (plan card).
- Page titles: 24 (session), 28 (Today), 34 (detail).
- Hero numbers: 26, 28 and 34.
- Drawer titles are 16 px medium, quieter than the cards behind them.

*Fix:* use the 6-step scale in "Design direction".

**10. Copy needs fixes.**

| Now | Change to |
|---|---|
| "Worst" and "Mod." (`pain-detail.tsx`) | "Unbearable" and "Moderate": one vocabulary |
| "days that were tingled" | "days with tingling" |
| "4 W / 3 M / 6 M" | "4 weeks · 3 months · 6 months" |
| "2 wk" | "2 weeks" |
| "PROGRESS" back label | "Progress" (sentence case) |
| "0 clean runs in a row" (streak language) | "Last run: not clean" / "Last 2 runs clean" |
| Ladder rules with "≤ 3/10" while pain is asked in words | "Clean = the arch stayed None or Mild, and was back to normal the next morning." |
| "load 104" | hide it, or "training load 104" in the detail only |
| "e.g. 72,4" next to "72.8 kg" | "e.g. 72.4" (accept both separators) |
| "Today's plan" on past days | "Plan" |

**11. Past days and other weeks are confusing.** `today.tsx`
On another day the h1 is "Wednesday" with "Wednesday 4 November" right under it. When the strip moves to another week, the content still shows the old day while "That week" describes the strip's week.
*Fix:* h1 "Wed 4 Nov", subtitle "2 days ago". Remove the week card (see #1).

**12. Check-in cards read badly once answered.** `check-card.tsx`
"Neck Moderate" wraps over 2 lines and the label runs into the value ("Hands A bit"). Before 19:00 the evening card already asks "How was today?" in blue.
*Fix:* one row per answer: label `text-sm text-muted-foreground` on the left, dot + word `text-sm font-semibold` on the right. Before 19:00 the evening card shows a quiet "From 19:00" and isn't a call to action.

**13. Logged rows say the same thing twice.** `plan-card.tsx`, `log-summary.tsx`
A filled check circle, then "✓ Done", then a grey title. *Fix:* inside a plan row, drop the status icon and word from `LogSummary`. Keep only the extras: "Arch ● Mild · Step 3, clean".

**14. The Progress dashboard has no headline; it's six equal cards.** `progress.tsx`
The Oura/Apple Health lesson: one sentence first.
*Fix:* add a top card such as "Neck worse this week. Arch steady.", built from the `compare()` verdicts. Card hero `text-[28px] font-semibold`, verdict as words without arrows ("↑ Worse" is ambiguous: up means more pain). Axis labels at 12 px, not 10. For the ladder card on day one, "Step 1 of 1" with a full blue bar looks finished: hide the card until `run_steps` exist.

**15. The pain detail screen needs work.** `pain-detail.tsx`
- The range control is a solid-blue pill. *Fix:* use shadcn `Tabs`.
- The screen switches to a white ground. *Fix:* keep the grey ground with white cards, like everywhere else.
- At 6M the axis starts in May, but answers start in September, so two-thirds of the chart is empty. *Fix:* start at the first answer.
- The violet marks are a colour that isn't in the tokens. *Fix:* use `foreground/60` with different mark shapes.
- The "bad day" bars are amber, which reads as "Moderate pain". *Fix:* use neutral `bg-foreground/70` bars and present it the Bearable way:

  > **Bike over 30 min**: bad day 7 of 13 (54%) · without: 1 of 11 (9%)
  > Small numbers: 24 days in all.

**16. The exercise flow has a dead end.** `exercise-screen.tsx`
The last exercise offers only "Close". "Today's plan" repeats the whole session's text on every exercise. The "Stop" guidance, which is safety information, is muted grey.
*Fix:* on the last exercise, a primary "Finish and log" that opens the log sheet with Done preselected. Show each exercise's own dose from the catalog. Show "Stop" in the foreground colour with a `TriangleAlert` icon.

**17. Missing information architecture.** `today.tsx`, `session-screen.tsx`, `activities-list.tsx`
- **Coach's note** (`reviews`): today it is never shown. *Fix:* on the first open of the week, show a calm card at the top of Today: "From your coach · week of 16 Nov", a 2-line clamp, and "Read" to open a sheet. For the rest of the week it shrinks to one row. Also link it from Progress → This week.
- **Run watch data:** a logged run shows no time, distance or HR. *Fix:* add a "From the watch" card on the run's session screen ("33 min · 4.7 km · 148 bpm"), add the distance to the plan-row summary, and give the run row in Activities a "Run A · Step 3" chip.

**18. Empty, first-run, gap and late days are bare.**
- Day one shows a one-line "Nothing planned" card. *Fix:* "No plan yet. Your coach writes it in the weekly chat."
- Progress on day one shows "0 of 0 sessions" and four cards of dashes. *Fix:* one card instead: "Trends show after a week of check-ins."
- After 3 or more days without logs (the gap scenario), nothing is said. *Fix:* "Welcome back. Past days stay as they are. Start with today."
- When yesterday wasn't logged (the late scenario), nothing on Today says so. *Fix:* add a quiet row: "Yesterday: 2 not logged · Log now".

**19. Icons.** Card icons (sunrise, moon, scale, flag, trend) are blue and compete with the data. Run and walk share `Footprints`. The log-out icon has the best spot on Today.
*Fix:* make the icons 16 px `text-muted-foreground`. Use `PersonStanding` for walk. Move "Log out" to a text button at the bottom of Progress.

**20. Toasts appear at the top centre** (`main.tsx`), cover the page title and are far from the thumb, and every tap in the morning sheet shows "Saved".
*Fix:* `position="bottom-center"` with `offset={88}` to clear the tab bar, `duration={2500}`, and one confirmation when the sheet closes.

### Low

**21. Focus is nearly invisible.** The base style is `outline-ring/50` (#a1a1a1 at 50%), and the custom buttons (plan rows, check cards, day pills, tabs) only get that faint grey ring.
*Fix:* in the `@layer base` block, `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }`.

**22. Tap targets.** The week arrows are 28 × 64 px (`w-7`). *Fix:* `w-11`, or drop the arrows (swiping and "Back to today" already exist) and give the pills that width.

**23. Semantics.**
- The Progress tabs have `role="tablist"` but no tabpanel, `aria-controls` or arrow keys. *Fix:* use shadcn `Tabs`.
- `PainScale` and the ladder `Select` have `<span>` labels. *Fix:* `fieldset` + `legend`, and `aria-labelledby`.
- The empty `StatusMark` has no text. *Fix:* add `sr-only` "Not logged yet".

**24. Radii and surfaces drift.** Hand-rolled cards use `rounded-[18px]`, but `Card` is `rounded-xl` (19.6 px). The log sheet's "Save" is `rounded-lg` while other buttons are pills. *Fix:* `CheckCard`, `PainCard`, `LadderCard` and `WeightCard` become `Card` with a button inside.

**25. Motion.** Screens change with a hard cut. The week strip's smooth scroll ignores reduced motion. Nothing acknowledges a status change. *Fix:* see the motion rules below.

**26. The Move sheet** uses the native date input (shown as 11/19/2026 in the test browser), and "Move" is disabled with no reason. *Fix:* chips for the next 7 days ("Fri 20", …) plus "Other date…", and the hint "Pick a different day".

**27. The app icon** (`public/icons/icon.svg`):
- Its blue (#155dfc) isn't the app's primary (#127ace).
- At 48 dp the toes turn to dust and the mark reads as a generic "steps" glyph next to Google Fit-style icons.
- The favicon is illegible at 16 px.

*Fix:* use the primary colour. Scale the mark up to fill about 62% of the safe circle. Use 3 larger toes or a single foot outline with the arch cut-out (the "pisada", the footprint, is the story). Add a `"purpose": "monochrome"` icon for Android themed icons. Give the favicon a simplified heel-and-arch silhouette.

---

## Design direction

### Type scale (6 steps, Geist, `tabular-nums` for numbers)

| Token | Tailwind | Use |
|---|---|---|
| caption | `text-xs` 12/16, 500 | Axis labels, overline (`uppercase tracking-wide font-semibold`, for "MORNING · NECK" only) |
| secondary | `text-sm` 14/20, 400 | Meta, descriptions, verdicts |
| body | `text-base` 16/24, 400 (500 for values) | Body and buttons |
| title | `text-base` 16/24, 600 | Card titles and row titles |
| heading | `text-xl` 20/28, 600 | Drawer titles, section titles, session title |
| display | `text-[28px]/[34px]` 700, `tracking-tight` | Page titles (Today, Progress, detail) |
| hero number | `text-[28px]` 600 on cards; `text-[40px]/none` 600 on detail screens | One per card |

Weight 700 is used only for display. Remove 10, 11, 13, 15, 17, 22, 26, 30 and 34.

### Spacing

Use only 4, 8, 12, 16, 24 and 32 px (`1, 2, 3, 4, 6, 8`).
- Page gutter: always `px-4`. Today uses 16, Progress and detail use 20.
- Card padding: `p-4`, not 14.
- Space between cards: `gap-3`.
- Sections inside a screen or sheet: `gap-6`.
- List rows: `min-h-16 py-3`.

### Cards and surfaces

- The grey ground on every screen, detail screens included. Content always sits on white `Card` (`rounded-xl`, `ring-1 ring-foreground/10`, no shadow). Headers are white with `border-b`.
- One radius family: cards `rounded-xl`, controls (inputs, toggles, figure panels) `rounded-lg`, buttons `rounded-full`.
- At most one filled primary button per screen, in the bottom thumb bar. Secondary actions are outline pills. Tertiary actions are ghost text.
- Colour carries meaning only: pain (always with its word) and status (always by shape too). Everything else is neutral.

### Motion (all under `motion-safe:`)

- Durations: 150–250 ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
- Pushing a screen: the new screen slides 16 px from the right and fades in, 200 ms. Back reverses it.
- Status saved: the mark scales 0.85 → 1 and fills, 150 ms. The row then settles to grey.
- Sheets: vaul's default.
- Skeletons: a slow pulse, appearing only after 150 ms.
- Numbers never count up. No confetti, no bounce.
- With `prefers-reduced-motion`: fades only, and `scrollTo` uses `behavior: 'auto'`.

### The 5 changes that raise the bar most

1. **"Up next" hero on Today with one-tap Done / Partly / Skip.** Also: a compact header and no duplicate week card. (#1, #13)
2. **Accent and contrast discipline.** Blue only for the primary action, done and links; fixed `--primary`, `--pain-low` and `--status-*`; partial shown by shape. (#2, #3, #8)
3. **One type and spacing system.** 6 sizes, one gutter, every card a real `Card`. (#9, #24)
4. **A states kit.** Visible skeletons with reserved heights, an error card with Retry, and calm lines for first run, gap and late days; at most one sheet per open. (#4, #5, #6, #18)
5. **Progress that speaks.** A one-sentence headline, the Bearable-style "goes with a bad day" list, the coach's note at the start of the week, and watch data on runs. (#14, #15, #17)
