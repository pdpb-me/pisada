# Review: Pedro C, "plans change"

Method: Playwright at 360 x 800, scenarios `moved`, `trip`, `new-block`, `ladder-up`, `today`, `ordinary`, `day-one`, `gap`. I read the demo DB with `pisadaDemo.db()`. Caveat: headless Chromium cannot open Android's native date picker, so I judged it from the markup and the closed field.

## Findings, ranked

### 1. The coach's weekly note and decisions are nowhere in the app (high)
- Where: whole app. `src/data/supabase.ts` loads `reviews`, but no component shows it. Dashboard, Today and the session screens have no note.
- What happens: in `new-block` the coach wrote "Step 5 for Wednesday's run. Step 6 is now in the ladder. Holiday from 7 Nov". In `gap` the note says "Restart at step 4, not 5". Pedro sees none of this. He only meets the result: Wed's run quietly says Step 4.
- Why it matters: the plan changes every week, and a number changing with no reason looks like a bug. Pedro must go back to the chat to learn why.
- Suggest: a "From your coach" card on Today on Monday and the first open each week (2 to 3 lines of summary, decisions below, "Read more" in a sheet). Also keep a "Notes" list in Progress.

### 2. Watch data is not shown on the session it belongs to (high)
- Where: session screen of a logged run or hike (`session-screen.tsx`), Progress > Activities.
- What happens: Run A, Wed 18 Nov, is logged. The session screen shows only "Done - Arch Mild - Step 4". The watch row (33 min, 4.7 km, 148 bpm, load 39) is a separate `intervals` row, visible only in Progress > Activities, one tab away, in a list of 28 items. On Hut trip day 2 the watch recorded 4 h 08, 11.8 km, 760 m climb. The hike screen is a big empty grey page.
- Why it matters: after a run, the first thing Pedro wants is "how did it go?" (time, pace feel, heart rate). He has to hunt for it. Without the link, the run's "clean" decision has no data next to it.
- Suggest: on a session day, match watch rows by date and sport (as COACH.md says) and show a small "From your watch" row: time, distance, avg bpm, climb. Link "See in Activities". For a hike, show the same. Fill the empty space on hike and Pilates screens.

### 3. The planned step is clear on the run, but Progress contradicts it (high)
- Where: Progress > "Run ladder" card; `progress.tsx`.
- What happens: on the run, "Step 5 - 3 x (8' jog / 1' walk)" is clear, and the ladder sheet marks "Now". But Progress says "Step 4 of 6, 4 clean runs in a row" (`new-block`), "Step 2 of 5" while step 3 is planned (`ladder-up`), and "Step 5, 5 clean runs" after the coach restarts at step 4 (`gap`). A logged run with `clean` not yet set also counts as "0 clean runs" in `today`.
- Why it matters: two different "current steps" on two screens. Nothing says "up a step" or "restart lower", and nothing says why.
- Suggest: on the Progress card show "Last run: step 4 - Next planned: step 5". On the run screen, add one short line when the step differs from the last logged one: "Up from step 4: two clean runs." or "Restart: back from a break." Take the line from the coach's note (finding 1).

### 4. Past days: the weekend routine is slow to fix, and nothing flags what is missing (high)
- Where: Today, past day; `today.tsx`, `week-strip.tsx`.
- What happens (`trip`, Mon 28 Sep, Sat/Sun on the hut): to catch up Sunday: strip day (1), neck micro-dose (2), Log session (3), Done (4), Save (5); hike: open (1), Log (2), Done (3), arch word (4), Save (5); morning check: open, answer, Done (3); evening check: open, neck, hands, Done (4). About 17 taps per day, 34 for the weekend. Nothing on Today says "Saturday and Sunday are not logged". An unlogged past session has the same grey empty circle as a future one.
- Suggest: (a) on past days, a one-tap "Mark all as done / skipped" for routine items; (b) put "2 days not logged" under the strip on Monday and link to the oldest one; (c) show a "not logged" mark on past unlogged sessions (a dashed ring or a word), different from planned.

### 5. After the arrow, the strip and the page disagree (medium)
- Where: `week-strip.tsx`, `today.tsx`.
- What happens: on Sunday 27 Sep tap "previous week". The strip shows 14-20 Sept with no day selected, but the page still shows Sunday 27 Sept. The card below says "That week - 13 of 14 sessions done", which is the strip week, not the Sunday shown. Pedro must tap a day to go on. Moving 3 weeks back means arrow taps plus a day tap, with no calendar jump.
- Suggest: the arrow keeps the same weekday selected (Sun to Sun) and loads it; or the "week done" card follows the selected day's week. Add "Jump to date" on the "Back to today" row.

### 6. Moving a session: workable, but 6 to 8 taps and some traps (medium)
- Where: `move-session.tsx`, session screen.
- Count: Run to Saturday from Today: run (1), "Move to another day" (2), date field (3), pick Saturday in the native calendar (about 2), Move (1) = about 6 taps. Pilates from another day: add a strip tap, and AM (1) = about 8. The result is good: the toast says "Moved to Saturday 24 October", the strip dots update at once (Sat shows 4 dots), and logs travel with it.
- Problems:
  - "Move to another day" is a small grey text link under the big "Log session" button. It is easy to miss. The sheet then repeats "Move to another day" (title "Move 'Run A'" and a label with the same words).
  - The native date field shows numbers only (in my run `10/22/2026`) with no weekday, and Pedro thinks in "Saturday". It does not start on a useful day and has no "tomorrow / Sat / Sun" shortcuts.
  - The selected AM/PM is a very faint grey (lightness 0.967 on white); hard to see which one is on.
  - After Move, he stays on the day he left. Nothing takes him to the new day. The toast has no "Undo" or "Show".
  - No warning on a clash. Moving Run A onto Saturday put it beside Run B (same day, same slot, and Pilates as well). The COACH rule is runs 48 h apart. The app says nothing.
- Suggest: chips "Tomorrow / Sat / Sun / Next Mon" plus "Pick a date"; show the weekday under the date; a toast with "Undo" and "Go to day"; a calm one-line note when two runs fall within 48 h ("Run B is on this day too").

### 7. "Today's plan" title on every day, and the check-in sheet says "this morning" on past days (medium)
- Where: `plan-card.tsx` (`'Today’s plan'`), `morning-check.tsx`.
- What happens: on Sunday 27 Sep the card says "Today's plan", the header says "Sunday". The morning sheet on that day says "This morning" and "Right arch, this morning". The evening sheet correctly says "How was that day?".
- Suggest: "Plan for Sunday" (or "Sunday's plan") when not today; "That morning" on past days. Also, on the 19:30 open (`ordinary`) the morning and evening sheets stack, so two "Later" taps are needed. Ask one at a time.

### 8. Header and layout jump when you leave the current week (low)
- Where: `today.tsx`.
- What happens: on a day outside this week, a "Back to today" link and a "21 Sept - 27 Sept" label appear, and the strip moves down about 45 px. It feels like the page twitches.
- Suggest: reserve the space, or put "Back to today" in the strip row.

### 9. First open (`day-one`) is empty with no guidance (medium)
- Where: Today and Progress with an empty database.
- What happens: "Nothing planned", and the morning sheet opens. Pedro does not learn that the coach sends the plan, or what to do next. Progress says "Run ladder - Step 1 of 1" and "Not enough answers yet" (several times).
- Suggest: an empty card with "Your plan comes from your coach chat. Open the chat and say 'weekly check-in'." One line about what Pisada does. Hide the ladder card until a run is planned. Do not say "Step 1 of 1".

### 10. `gap` (back from holiday): app acts as if nothing happened (low-medium)
- What happens: Monday opens on "Today's plan" with the morning check pre-answered "None" (demo data). Nine days of watch hikes and walks sit in Activities. Nothing says "welcome back, restart at step 4". See finding 1.
- Suggest: the coach card (finding 1) handles this. Also, the Progress cards show "Not enough answers yet" for 2 weeks; add "No check-ins 7 to 15 Nov" so it does not look broken.

### 11. Small wording and consistency items (low)
- Activities header says "From the watch, every morning" but the sync is 07:00 and 20:00. A run logged at 19:30 has no watch row until 20:00 or next morning; say "updates twice a day".
- "1,5' walk" uses a decimal comma, while the rest is English (and the weight placeholder is `72,4`). Pick one.
- Hike and Pilates log lines say "Arch" where the sheet says "Right arch".
- The dots on the strip have no legend; "skipped" (dark grey) and "not logged" (light grey) differ only a little.
- The ladder sheet clips the last step under the Close button when step 6 exists; scroll area unclear.
- Morning arch: one tap saves, but the sheet stays until a second tap on "Done". For the weakest habit (daily micro-dose), this extra tap adds up.

## What works well
- The week strip: swipe and arrows work, today keeps a ring when another day is chosen, dot counts update at once after a move (Sat went to 4 dots).
- Toast "Moved to Saturday 24 October" is plain and has the weekday.
- Anything already logged moves with the session ("Anything already logged moves with it").
- Run screen is easy to read: warm-up, run-walk, cool-down, total minutes, and "See the whole ladder" with a "Now" mark.
- Pain words with colour, answered in one tap and saved at once ("Saved").
- Activities tab is clear: month, week totals, "Last synced", "Sync now".
- Past-day check-ins use "How was that day?", so catch-up works without leaving Today.
- Primary buttons sit low, targets are large, nothing is gamified.
