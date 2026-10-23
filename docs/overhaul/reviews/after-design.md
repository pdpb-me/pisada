# Design re-review: Pisada "after" build

Reviewer: the same design critic as [`design.md`](design.md). Base: about 45 live screenshots at 360 × 800 (today, test-day, ordinary, bike, flare, sick, late, gap, day-one, moved; the log, move, coach-note, ladder and test-history sheets; Progress, the Arch/Neck/Hands/Weight details, Activities; `&latency=1500`), plus the code in `src/components/` and `src/index.css`.

**Overall.** This is a different app. Logging is now one tap, nothing pops up by itself, and Progress opens with a sentence. Blue is disciplined, selected states are dark, and the empty and gap states are calm. What is left is mostly **order** (the plan still sits below the fold most mornings), one **colour-meaning bug** (a dot's colour that disagrees with its word) and polish.

## Contrast, recomputed (WCAG 2.x, from OKLCH)

| Pair | Ratio | Verdict |
|---|---|---|
| `--primary` #006dc3 text on white | 5.25 | Pass |
| `--primary` text on the grey ground | 4.77 | Pass |
| `--primary-foreground` on `--primary` (buttons) | 5.03 | Pass |
| `--pain-low` #05893e as a dot or bar on white | 4.54 | Pass (≥ 3 needed) |
| **`--pain-low-foreground` (0.985) on `--pain-low`** (selected None/Mild chips, 13 px) | **4.34** | **Fail** for normal text. My earlier "about 4.6" was measured against pure white, not the 0.985 token. |
| `--status-skipped` #808080 on white / on grey | 3.95 / 3.59 | Pass for icons and dots (≥ 3) |
| `--muted-foreground` on white / on grey | 6.00 / 5.45 | Pass |

Fix: `--pain-low: oklch(0.52 0.14 150)` (#0a7e3a). That gives 4.95 with the chip text and 5.17 on white, and it still reads as the same green.

## The 27 earlier findings

1. Hero and taps deep: **PARTLY.** One-tap Done/Partly/Skipped on rows works, and the week card is gone. But the plan is still below the fold in most morning scenarios (see A).
2. Accent doing nine jobs: **FIXED.** A few strays remain: the blue cue ticks, the blue "Last run" badge and "Answer now" before 18:00.
3. Contrast: **PARTLY.** Primary, skipped and partial (now shown by shape) pass. The pain-low chip text still fails (see the table above).
4. Loading: **PARTLY.** Skeletons are visible now. The check-in skeleton is `h-20` against a real card of about 410 px, so the plan jumps.
5. Error states: **FIXED** in code (`ErrorCard` with "Try again"). The demo doesn't trigger it.
6. Two stacked sheets: **FIXED.** A new ordering problem replaces it in the evening (see B).
7. Log sheet model: **FIXED.** It has "Close", a stable layout, "Add a note" and a placeholder per kind.
8. Selected states: **FIXED.** Selected is a dark fill (Clean, Morning/Evening, the move chips).
9. Type scale: **PARTLY.** It is close to 6 steps. Strays: `text-[13px]` chips, `text-lg` cues, `text-[11px]` chart labels, and drawer titles at weight 500.
10. Copy: **PARTLY.** Most items are fixed. "load" is still on every activity row. New: "Stop zone", a lowercase "usual", and the "Yesterday" sentence (F, P).
11. Past days: **FIXED.** The header reads "Tuesday / 6 Oct · yesterday · Back to today".
12. Answered check-ins: **PARTLY.** Answered cards are now one clean row. The evening card before 18:00 is still a blue call to action (Q).
13. Logged rows say it twice: **FIXED.**
14. Progress headline: **FIXED.** But it misses a flare (G).
15. Pain detail: **PARTLY.** It has the grey ground, neutral marks, a legend and the Bearable list. The range control doesn't match the other tabs (K).
16. Exercise dead end: **PARTLY.** "Finish and log" and a "Stop if" box with an icon are there. "Today's plan" still repeats the session text, and it contradicts the exercise's own dose (H).
17. Coach note and watch data: **FIXED.**
18. Empty, first-run, gap and late states: **FIXED.**
19. Icons: **FIXED.** They are muted, and "Log out" moved to the bottom of Progress.
20. Toasts: **PARTLY.** They sit at the bottom now, but they cover the next row's buttons and stack (E).
21. Focus ring: **FIXED.**
22. Week arrows: **FIXED** (`size-11`).
23. Semantics: **FIXED.** shadcn `Tabs`, `fieldset`/`legend` and status `aria-label`s are in place.
24. Radii and surfaces: **FIXED.**
25. Motion: **FIXED.** Screens slide in, status marks pop, and reduced motion gets fades only.
26. Move sheet: **FIXED.** It has 7 day chips plus "Other", and the button says what will happen.
27. App icon: **FIXED.** It uses the app's blue, has 3 toes and the arch, and comes with a monochrome version.

## Remaining and new issues (ranked)

### High

**A. The plan is below the fold most mornings.** Today, `today.tsx`, `coach-note.tsx`, `check-ins.tsx`
In today, late, flare, gap and test-day, the coach card (about 225 px) and the morning card (about 410 px) push the first Done button past 800 px. Adherence is still the weak point.
*Fix:*
- Coach card: `line-clamp-2`, `gap-2 py-3`, and one row of actions as ghost buttons ("Read" and "Got it", `h-11`) instead of two pills.
- Morning card: put "Add weight" in the legend row (`flex justify-between`) instead of a separate 44 px row.
- Show the clean definition only after "Not clean" is tapped, or behind an `InfoIcon` toggle.
- "Yesterday" row: one line, `min-h-12`.
- Target: the first row's Done/Partly/Skipped is visible at 360 × 800 in the today scenario.

**B. In the evening, the question that is due sits at the bottom.** Today, `today.tsx`
In ordinary at 19:30, the unanswered morning card ("How's the arch this morning?") is still full size at the top. The evening card, the one due now, is below the fold.
*Fix:* when `ask.evening === 'now'`, render `EveningCheckIn` before the plan. Collapse an unanswered morning to one `Answered`-style row: "Morning not answered · Answer".

**C. A pain dot's colour contradicts its word.** Progress Arch and Neck cards, `pain-detail.tsx` (around line 90), the `AreaCard` in `progress.tsx`
The word is the typical answer but the dot follows the worst one: you see a **red dot next to "Moderate"** and an **amber dot next to "Mild"**. That breaks "pain colour always comes with its word".
*Fix:* the hero dot uses `painBand(week.typical)`. Add a second line with its own dot: "Worst: ● Severe (Thu)".

**D. The selected None/Mild chips fail contrast (4.34).** `index.css`
*Fix:* `--pain-low: oklch(0.52 0.14 150)` (see the table above).

### Medium

**E. Toasts cover the next action.** `main.tsx`, `plan-list.tsx`
After Done on the first row, the toast sits exactly on the second row's buttons. Two quick logs stack two toasts, about 200 px of cover.
*Fix:* `<Toaster visibleToasts={1} … />` and `toast(msg, { id: 'log', … })` so each new toast replaces the last one. `duration={2500}`.

**F. "Stop zone" on a weekly summary.** Pain detail hero, `trends.ts` `zoneText`
It is alarming, it is jargon, and it describes the worst day, not the week. "usual · latest Severe (Thu)" starts with a lowercase word.
*Fix:* "Most days, last 7 days" / "Worst: ● Severe on Thu". Drop `zoneText` from the hero.

**G. The headline misses a flare.** Progress, flare scenario
The latest arch answer is Moderate (Thu), yet the headline says "Arch and neck about the same."
*Fix:* if any latest answer is Moderate or worse, lead with it: "Arch sore on Thu (Moderate). Hands better."

**H. Two doses for one exercise.** Session and exercise screens
The session text says "chair extension 1 × 8", but the exercise row and the exercise screen say "6 slow reps".
*Fix:* remove the "Today's plan" section from the exercise screen. When `session.instructions` exists, hide the catalog dose on the session row. Add a line to COACH.md: "write doses that match the catalog, or name the exercise's dose".

**I. The layout jumps while loading.** Today at `latency=1500`
The check-in skeleton is `h-20`; the real card is about 300 to 410 px.
*Fix:* render the column (coach, check-ins, plan) only when the day and the check-ins have both loaded. Until then show one `CardSkeleton` stack, then `animate-fade-in`.

**J. The weight sparkline exaggerates noise.** Progress weight card
`span = Math.max(hi - lo, 0.5)` makes a ±0.4 kg wobble a zig-zag, while the text says "about the same".
*Fix:* `Math.max(hi - lo, 3)` centred on the mean, or plot the weekly averages.

**K. Two tab styles.** `detail-parts.tsx`
The range tabs are a black pill on white. Overview/Activities is a white pill on a grey track.
*Fix:* remove the `data-[state=active]:bg-foreground …` and `bg-card ring-1` overrides and use the default `TabsList`. Dark fill stays for choices, not navigation.

**L. The hands chart has about 90 px of empty band.** Hands detail
The 5-level height is used for a 3-level scale.
*Fix:* set the chart height from the number of levels (`levels.length * 50 + 40`).

**M. The sore-arch note looks like loose text.** Today, flare scenario, `check-ins.tsx`
It uses `bg-muted`, which is the same colour as the page ground (the same trap as the old skeleton).
*Fix:* put it inside the answered card, under the row (`border-t pt-3`), or use `bg-card ring-1 ring-foreground/10 rounded-xl`.

### Low

**N. Sheets: the title is centred but the body is left-aligned.** The titles are also weight 500, and the log sheet has a dead 60 px gap above "Clear this log".
*Fix:* `DrawerHeader className="text-left"`, `DrawerTitle className="text-xl font-semibold"`. Footer row: ghost "Clear this log" on the left, "Close" on the right.

**O. The ladder sheet opens at step 1**, with the current step cut off under "Close".
*Fix:* `scrollIntoView({ block: 'center' })` on the current step. Make the badge `bg-foreground text-background` instead of blue.

**P. Copy for the "Yesterday" row.** Change "1 session, the morning and the evening not logged" to "1 session and 2 check-ins not logged."

**Q. Evening card before 18:00.** Make "Answer now" `text-muted-foreground`, or remove it: the card's own tap can open it.

**R. Off-scale sizes.** Chips `text-[13px]` → `text-sm tracking-tight` (check that "Unbearable" fits at 360). Cues `text-lg` → `text-base font-medium`. Chart labels `text-[11px]` → `text-xs`.

**S. Test card.** Its subtitle repeats the header's "Stop if…". The placeholder "reps" at 24 px reads like a value.
*Fix:* subtitle "Left first." Placeholder "–", with "reps" as a `text-sm text-muted-foreground` suffix.

**T. The disabled Move button text** (white on 50% blue, about 2:1). *Fix:* `variant="outline"` while disabled.

**U. The session screen stays open after logging through the sheet** (FINDINGS #28 said it goes back). *Fix:* call `onBack()` after the log sheet closes, the first time only.

## Top 3 to do next

1. **Reorder Today** for the moment of day (A, B): the plan's first action above the fold, and the evening question first in the evening.
2. **Colour-meaning integrity** (C, D, F): the dot matches its word, the green passes contrast, and no "Stop zone".
3. **Quiet feedback** (E, I, M): one toast that doesn't cover the next tap, no loading jump, and notes that sit on a surface.
