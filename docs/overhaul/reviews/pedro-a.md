# Review: Pedro A, the hurried weekday

Viewport 360 x 800, "before" demo. Scenarios used: today (Thu 19 Nov, then Fri, Sat, Sun via nextDay), ordinary, late, test. Screenshots are in `/tmp/claude-0/pedro-a/` (01-70).

## Tap counts (what Pedro actually does)

| Job | Taps | Screens / sheets |
|---|---|---|
| Morning arch check-in (sheet opens by itself) | 2 (arch, Done). 3 if "yesterday's run clean?" is shown. +2 for weight (tap field, type) | 0 extra screens. Good. |
| Neck micro-dose as "Partial" + comment | 6: row, Log session, Partial, tap comment (+type), Save, Back | Today > session screen > sheet > session screen > Today |
| Neck micro-dose as "Done" | 5: row, Log session, Done, Save, Back | same |
| Heel-raise test with reps L/R + arch | 8: row, Log session, Done, arch, L field (+type), R field (+type), Save, Back | same |
| Evening check-in | 4 from the card (card, neck, tingling, Done); 3 if the sheet opens by itself | one sheet |
| Run: done, step, clean, arch during | 7: row, Log session, Done, arch, Clean, Save, Back (step is pre-selected) | same |
| Fix a missed day (late scenario): arch + evening + one session | about 12, plus finding the day first | day screen + 3 sheets |

The morning check-in is the best part of the app. Everything session-related is 2-3 taps too long for a 5-minute morning.

## Findings, ranked

### 1. Neck micro-dose needs 5-6 taps and 3 screens (high)
Where: Today > `session-screen.tsx` > `log-drawer.tsx`.
What: the micro-dose is a daily routine that Pedro often does only partly. To log it he opens the session screen, taps "Log session", picks Done/Partial/Skipped, optionally types, taps Save, then taps Back. The session screen is a list of 3 exercises he already knows by heart.
Why it matters: adherence is the weak spot (4 done / 3 partly / 3 skipped in 10 days). Every extra tap costs logs.
Suggestion: on the Today row, a long-press or small trailing control with Done / Partial / Skipped (1 tap). Partial can open the comment sheet. Also close the sheet AND go back to Today after Save for routines (see #2).

### 2. After "Save" the app stays on the session screen (medium)
Where: `session-screen.tsx`, after saving in the log sheet.
What: Pedro has to tap the small back arrow (top left, the hardest place for one thumb) to return to Today. This is the 6th tap for every session.
Suggestion: return to Today automatically after Save (keep "Edit" available from Today). At least move "Back" to the bottom.

### 3. "Partial" counts as done, and says nothing on Today (medium)
Where: `plan-card.tsx`, "Today's plan 1 of 2 done", "This week 7 of 14 sessions done".
What: the Partial micro-dose gets a pale-blue filled tick and "Partial", and counts in "1 of 2 done" and in the week count. The comment ("Only chin nods, no time") is not shown on Today. Pale blue vs strong blue is a small difference.
Why: Pedro cannot tell at a glance what was full and what was half. The counters look better than they are.
Suggestion: show Partial with a half-filled ring (not a tick), show the first line of the comment, and say "done or partly" if it is counted.

### 4. Heel-raise test: result has no context, and no history from the card (high)
Where: Today row, session screen footer, Progress "Heel raises" card (`progress.tsx`).
What:
- In the test log sheet there is no "last time: L 21, R 12" and no target. Pedro types two numbers blind.
- The Today row shows "Done · Arch ● Mild · L 22 · R 15 reps". It wraps onto two lines with a dangling "·" at the end of line 1, and does not say better or worse than last time.
- On Progress, the Heel raises card shows "Left 23 from 21, Right 17 from 12". This is the only good view, but "from 21" is unclear (before it was 21?). No arrows, no left/right gap, no colour. The footer "Last 26 Oct · Test today" is confusing when the test was done today ("Test today" reads like a to-do).
- The card is NOT tappable (I tapped it; nothing happened). Arch, Neck, Hands and Weight open a detail with a chart; the Heel raises and the Run ladder cards look the same but only the ladder opens. So Pedro cannot see the test over time (one point per test, L and R lines).
Suggestion: show "Last: L 21 / R 12" in the log sheet; use "Up 2" / "Up 5" with an arrow in the card; make the card open a detail screen (L and R over time, with the gap between sides); drop "Test today".

### 5. Evening sheet did not open by itself after a time jump (medium, needs checking)
Where: `evening-check.tsx` (opens from 19:00).
What: in the today scenario, after `setTime('19:30')` (twice, also on Friday) the sheet never opened, but the "asked" key was set in localStorage, so it will not open again that day. In `ordinary` (loaded at 19:30) it did open. It may be a demo-clock artefact, but the flag is set even though nothing was shown. If real, Pedro silently loses his evening prompt.
Suggestion: set the "asked" flag only when the sheet really opened (after the animation), and check the case where the app stays open across 19:00.

### 6. Two check-in sheets stack at 19:30 (medium)
Where: `ordinary` scenario, morning-check and evening-check.
What: if the morning was not answered, at 19:30 both sheets open on top of each other: "How was today?" in front and "This morning" behind (a grey strip shows). I had to tap "Later" twice (the first "Later" hits the hidden one in tests; for Pedro it is the front one first). Asking "Right arch, this morning" at 19:30 is odd.
Suggestion: open only one sheet, the one for the time of day. After noon, do not auto-open the morning sheet; keep the card.

### 7. Run log: "Clean run?" is asked twice (high)
Where: `run-log.tsx` (log sheet) and `morning-check.tsx` ("Was yesterday's run clean?").
What: in the run log Pedro must choose Clean / Not clean right after the run, yet the help text says "Clean = ... back to baseline next morning". He cannot know that yet. Next morning, even though I answered "Clean" the evening before, the morning sheet asks "Was yesterday's run clean?" again (Sunday, screenshot 36), and the Clean button looks grey, not clearly picked.
Why: duplicate question, confusing, and wrong data if he guesses in the evening.
Suggestion: ask only in the morning (the evening sheet says "Clean? Tomorrow morning"), or only in the evening and never ask again. If both stay, show the first answer in the morning sheet.

### 8. Run log sheet is too tall; comment field hidden (medium)
Where: `run-log.tsx` inside `log-drawer.tsx`, 360 x 800.
What: Done/Partial/Skipped, arch during, step picker, Clean, a 4-line help text, then "Comment (optional)" whose text box sits under the Save button, so the comment cannot be seen without scrolling. The 4-line "Clean = ..." text is dense for a non-native reader ("niggle", "lingers", "holds the step").
Suggestion: collapse the rules into a small "What is clean?" link; make the sheet scroll with Save pinned and the comment visible; replace "niggle" with "pain".

### 9. Selected state of Clean / Not clean is almost invisible (medium)
Where: morning sheet and run sheet.
What: after tapping Clean, the button only turns light grey (screenshot 03, 33). The pain buttons turn solid green and Done/Partial turn solid blue. There is no tick, so Pedro does not know if it saved. (The "Saved" toast helps but is gone in 2 s.)
Suggestion: same strong selected style as the other segmented buttons.

### 10. Missing yesterday: nothing on Today says so (high for the "late" job)
Where: Today, `week-strip.tsx`, scenario `late`.
What: on Wed 7 Oct, Tue's Pilates and both Tuesday check-ins are missing. Today shows no hint. The only cue is two tiny dots under "6" in the week strip (blue and grey; the meaning is not explained and the Monday dots are a pale blue and grey). Pedro has to guess, tap the 6, see "Today's plan 1 of 2 done", and then fix three things one by one: arch card (2 taps), evening card (3-4 taps), Pilates (4-5 taps). About 12 taps.
Past-day wording problems: the page title says "Tuesday" and the subtitle "Tuesday 6 October" (repeated); the card is called "Today's plan"; the arch sheet on a past day still says "This morning ... Right arch, this morning"; the arch card still says "How's the arch?" (present tense), while the evening card does say "How was that day?".
Suggestion: a quiet line on Today, "Yesterday: 3 things not logged. Fix", opening a single list. On past days: "Plan", "How was the arch that morning?".

### 11. Today card sits behind a sheet on first open (low)
What: every morning the arch sheet opens first and hides the plan. It is quick (good), but "Later" is the only way out until something is answered, and the blue "Later" looks like the main action. After answering, the button turns into "Done".
Suggestion: keep it, but make "Later" a quieter text button.

### 12. Small wording and layout glitches (low)
- Comment placeholder for every session: "e.g. arch tight on the last set, eased after". For a neck micro-dose or Pilates this is odd. Use a hint that fits the session kind.
- Toast "Saved" appears over the header, and on session screens it covers the back arrow and title for about 2 s. Sometimes two toasts stack (screenshot 03).
- Decimal comma in "1,5' walk" and in the weight placeholder "72,4", but typing "72.4" works and shows "72.4 kg". Mixed comma/dot looks sloppy; pick one.
- "Evening · Test" on the Today row for a test: the test is done at 19:00+? If not, "Evening" is a surprise on a Monday morning.
- "This week: 6 of 14 sessions done" and "Today's plan 2 of 2 done" are two similar counters on one screen.
- The Run B row text "Step 4 -- 3 x (7' jog / 1,5' walk) · ~34 min" is long; on `late` it wraps with a dangling "·".
- Dots in the week strip (two per day) have no legend. Morning and evening? Unclear.

## What works well
- The morning arch sheet: opens by itself, one tap per answer, saves at once, weight is optional on the same sheet. 2 taps, no typing.
- Pain words with colour (Mild with a green dot) are clear and consistent on Today, Progress and the sheets.
- Tap targets are 44 px or more everywhere I measured; primary buttons are at the bottom.
- The run screen is clear: warm-up, run-walk, cool-down, and "See the whole ladder" with a "Now" marker.
- Reps fields use a numeric keypad (`inputMode="numeric"`), the weight field a decimal keypad.
- Arch detail chart (zone band, run-day markers) reads easily; the Progress dashboard is calm and light.
- Past days can be reached from the week strip with "Back to today" at the top.

## Suggested priority for the overhaul
1. One-tap Done/Partial/Skipped on the Today row (#1) and return to Today after Save (#2).
2. Heel-raise test: show last result in the sheet, "up/down" in the card, tappable detail with history (#4).
3. Clean-run asked once only (#7), strong selected state (#9).
4. "Missing yesterday" prompt and past-day wording (#10).
5. Fix the evening sheet flag and the stacked sheets (#5, #6).
