# After review: Pedro C, "plans change"

Method: Playwright at 360 x 800 on the new demo (port 4175). Scenarios: `moved`, `trip`, `new-block`, `ladder-up`, `today` (a logged run), `gap`, `day-one`. I counted taps by script. Screenshots are in `/tmp/claude-0/pedro-c2/`. Caveat: headless Chromium cannot open Android's date picker, so I did not test the "Other" date field itself.

Short version: this is a big step up. The coach's note, the watch data, the clash warning and the fast catch-up all work. What is left is small, except one old bug (the arrow on the week strip).

## My earlier findings, one by one

| # | Earlier finding | Now | Why |
|---|---|---|---|
| 1 | Coach's weekly note is nowhere | **FIXED** | Card "From your coach · week of 2 Nov" is the first thing on Today. "Read all" opens a sheet with "This week" and "Last week", all readable, with a Close button. "Got it" turns the card into one quiet row ("Coach's note for this week") that still opens it. Progress also has a "Coach's note" row. `gap` also gets a "Welcome back" card. |
| 2 | Watch data not on the session | **FIXED** | A logged run shows a "From your watch" card (35 min, 5.0 km, 147 bpm). The hike shows time, distance, bpm and climb (4 h 08, 11.8 km, 116 bpm, 760 m). On Today the log line also carries "4 h 08 · 11.8 km". The empty grey hike screen is gone. |
| 3 | Progress and run disagree on the step | **MOSTLY FIXED** | Progress now says "Step 5 of 6 / Next run Wed, 4 Nov · last run step 4, clean". In `gap`: "Step 4 of 6 · last run step 5, clean, not decided yet". Both screens now say "planned". The run screen says "Step 5, planned by your coach". The reason (up, or restart) comes only from the coach's note, not from the run screen. I accept that. |
| 4 | Catching up past days: about 17 taps a day, nothing flags what is missing | **MOSTLY FIXED** | Sunday of `trip`: Fill in (1), arch word (2), Done neck (3), Done hike (4), neck word (5), hands word (6) = **6 taps** (was about 17). Saturday: strip day, Done, neck word, hands word = about 4. The weekend is about 10 taps (was about 34). The Monday card "Yesterday: ... not logged" with "Leave it / Fill in" is a good nudge. Unlogged past sessions now have a dashed ring, and the strip shows a hollow ring for "not logged". Left over: the nudge only covers yesterday (Saturday's missing neck dose is not flagged on Monday), and its wording is confusing (see new problem 3). "Skip all" exists, but there is no "Done all". |
| 5 | After the arrow, strip and page disagree | **NOT FIXED** | On Sunday 27 Sept I tapped "Previous week". The strip shows 14 to 20 Sept with no day selected, but the page still shows Sunday 27 Sept's check-in and plan. The header only says "Sunday" and "Week of 14 Sept · Back to today". Better than before (the label says it is a week), but it still looks like Sunday 20 Sept. |
| 6 | Moving a session: 6 to 8 taps, small link, native date field, faint AM/PM, no clash warning, no way to the new day | **FIXED (one gap)** | "Move" is now top right of the session screen, with an icon. The sheet has 7 day chips (with weekday and number) plus "Other", a weekday under it, and Morning / Evening in clear black when chosen. Run A to Saturday: run (1), Move (2), Sat chip (3), Move to Sat (4) = **4 taps** (was about 6). Pilates to Sunday morning: strip day, Pilates, Move, Sun, Morning, confirm = **6 taps** (was about 8). **Clash warning works**: "There's another run on Sat, 24 Oct. Runs are best at least 48 hours apart." The toast says "Moved to Saturday 24 October" with "Go to day", which really jumps there. Gap: no Undo (see new problem 4). |
| 7 | "Today's plan" on every day; "this morning" on past days; two sheets stacked | **FIXED** | The card is just "Plan". Past days say "How was the arch that morning?" and "That morning". No sheet opens by itself, so nothing stacks. |
| 8 | Header jumps when leaving this week | **FIXED** | "Back to today" now sits in the subtitle line ("27 Sept · yesterday · Back to today"). The strip does not move. |
| 9 | `day-one` empty with no guidance | **FIXED** | Today: "No plan yet. Your coach writes the plan at the weekly check-in in the chat. Say 'weekly check-in' there, and it shows here." Progress: one calm card "Trends show here after a week of check-ins". No ladder card, no "Step 1 of 1". |
| 10 | `gap` acts as if nothing happened | **MOSTLY FIXED** | Coach note ("Restart at step 4, not 5, after the break") plus "Welcome back: 10 days without the app. Past days stay as they are: no need to fill them in." Progress ladder shows step 4. Left over: the Progress cards say "1 of the last 7 days answered" but never say "holiday", and the Welcome card has no way to put it away. |
| 11 | Small items | **PARTLY** | FIXED: Activities now says "Updates at 07:00 and 20:00"; "1,5'" is now "1.5'"; AM/PM contrast; "check-in" sheets; the morning arch saves in one tap and there is no extra Done. NOT FIXED: log lines still say "Arch" where the sheet says "Right arch"; the strip dots have no legend (the hollow ring is better, but still unexplained); the ladder sheet still opens with the planned step cut off (see new problem 6). |

## Scenario notes

- `moved`: the coach note is on top ("Down to step 3 ... Move sessions yourself if the arch needs an extra rest day"). That fits the Move flow well. After the move, the strip dot count for Saturday goes up at once. Pilates moved to Sunday Morning sits in the right order on Sunday.
- `trip`: weekend catch-up is quick. Hike days now show watch data and an optional "Add arch pain" link; tapping Done on the hike screen opens a small "How did it go?" sheet (arch word, then Close).
- `new-block` / `ladder-up`: the coach note says why (Step 5, Step 6 added, holiday). The run says "Step 5, planned by your coach". The ladder sheet uses "Planned" instead of "Now", which is more honest. Ladder rules are in plain words. Progress shows "Next run ... last run step 4, clean".
- `today`: a logged run shows "From your watch" and a clear log line.
- `gap` and `day-one`: see rows 9 and 10.
- Tap targets: I measured every button at 360 px; none is under 44 px high.

## New problems, ranked

1. **Medium: strip arrows still leave the page on another week (old finding 5).** Suggest: arrow keeps the same weekday and loads it (Sun to Sun), or the header shows the full date ("Sunday 27 Sept") and not just "Sunday". At least never show a day's card under a strip that does not contain that day.
2. **Medium: the Move chips cannot go earlier than the session's own date.** For a future session the 7 chips start at the session's date (Pilates on Sat gives Sat to Fri next week). If the teacher moves a class from Sat to Thursday, or Run B earlier, Pedro must use "Other" and the native picker. Suggest: start the chips from today, with the current day marked.
3. **Low-medium: the Monday nudge is unclear and only covers yesterday.** "Yesterday: 2 sessions, the morning and the evening not logged" mixes sessions and check-ins. Saturday's missing neck dose is not mentioned. Suggest: "Sunday: neck micro-dose, hike and evening check-in not logged", and when more than one day is open, "2 days not logged" with Fill in going to the oldest.
4. **Low-medium: no Undo after a Move.** There is "Go to day", but a wrong chip means opening the session again. Done and Skipped already have Undo, so Move feels less safe.
5. **Low: toasts pile up and cover content.** After three quick taps on a past day, two "done / Undo" toasts stack and hide the "How was that day?" card (screenshot `t07.png`). Suggest: one toast at a time, shorter.
6. **Low: the ladder sheet opens with the planned step half hidden** (Step 5 is cut at the bottom; Step 6 and the rules need a scroll with no hint). Suggest: scroll to the planned step on open.
7. **Low: Monday with a coach note, a "Yesterday" nudge and a morning check pushes the Plan below the fold** (the "Plan" header starts at about y = 680 of 800 in `trip`). Suggest: after "Got it" the note is one row, so this is only the first open; maybe put the nudge inside the Plan card.
8. **Low: coach card shows "Read all" even when the text fits** (4-line clamp), and a longer note would be cut mid-sentence with no "..." hint. Fine for now.
9. **Low: the run's watch numbers appear twice** (watch card and the log line "35 min · 5.0 km").
10. **Low: "Arch" vs "Right arch" in log lines; no strip legend; the "Welcome back" card cannot be dismissed.**
11. Demo only: reloading `new-block` after "Got it" came back on Thursday 5 Nov. That looks like a demo clock effect, not an app bug.

## What works well now

- The coach's note: first on Today, readable in full, and easy to put away. Never blocks the plan.
- Done / Partly / Skipped right on Today, and on the session screen at the bottom; the undo toast.
- Catching up a weekend takes about a third of the old taps.
- The 48 h run warning appears right in the Move sheet, calmly, without blocking.
- Watch data sits on the session it belongs to.
- Empty and gap states explain themselves in plain English.
