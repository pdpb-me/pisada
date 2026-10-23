# Re-test: Pedro A, the hurried weekday (after the overhaul)

Viewport 360 x 800, demo on port 4175. Scenarios: `today` (Thu 5 Nov, then `setTime('19:30')`, then `nextDay()` to Friday), `test-day`, `ordinary`, `late`. Screenshots are in `/tmp/claude-0/after-pedro-a/`. A "tap" is one finger touch; typing is not counted; scrolling is mentioned where needed.

**Overall:** a big improvement. The morning is now 3 taps instead of 7 to 8, no sheet jumps up by itself, and fixing a missed day went from about 12 taps to 5. What is left is mostly small: the "Partly + note" path is as long as before, toasts cover buttons, and a few words are still not plain.

## Tap counts, before and after

| Job | Before | After | How (after) |
|---|---|---|---|
| Morning arch check-in | 2 (3 with "clean?") | 1 (2 with "clean?") | None/Mild... on the card; with "clean?" the card folds into a one-line summary. No sheet to close. |
| Neck micro-dose as Done | 5 | **1** | Done button on the Today row. Toast with Undo. |
| Neck micro-dose as Partly, no note | 6 | **1** | Partly on the row. Half-filled ring. |
| Neck micro-dose as Partly + short note | 6 | **6** | Partly, tap row, Edit, Add a note, (type), Close, Today. Same length as before. |
| Whole Thursday morning (arch + clean + neck Done) | 7 to 8 | **3** | |
| Heel-raise test, L/R reps (arch + clean not counted) | 8 | **4** | Enter results, tap Left (type), tap Right (type), Today. There is no Save: it saves when the box loses focus. |
| Evening check-in (neck + hands) | 4 (3 if the sheet opened) | **2** | Two taps on the card at the bottom of Today. After 19:00 it is below the fold: one scroll. |
| Evening session logged (Balance & hips, Pilates) | 5 | **1** | Done/Partly/Skipped on the row. |
| Run: done | 7 | **1** | Done on the row. The step is pre-filled. |
| Run: done + arch during | 7 | **6** | Done, Add arch pain (opens the session screen, not the question), Edit, Mild, Close, Today. |
| Friday (nextDay): arch + neck | not measured | **2**, evening Pilates 1 + check-in 2 | |
| Fix a missed day (`late`: arch + Pilates + evening check) | about 12 + finding the day | **5** (+1 "Back to today") | Fill in on the "Yesterday" row, arch, Pilates Done, neck, hands. |
| Fix one wrong log on a past day (Partly to Done) | not measured | 5 | Row, Edit, Done, Close, Today. |
| Where is last test / history? | not visible / not tappable | last time is in the boxes; "See every test" (1 tap) and the Progress card (1 tap) | |

## Earlier findings, one by one

1. **Neck micro-dose needs 5-6 taps (high): FIXED.** One tap on the Today row for Done, Partly or Skipped, with a toast and Undo.
2. **After Save the app stays on the session screen (medium): PARTLY.** Done/Partly/Skipped at the bottom of the session screen now log and go back to Today (checked with Partly). But after Edit > Close you stay on the session screen and need one more tap on "Today".
3. **Partial looks like done and counts as done (medium): PARTLY.** The ring is half-filled and the note shows on the row ("Only chin nods, no time"): good. Progress says "6 of 10 done, 2 partly": good. But the Plan header on Today still says "2 of 2 done" when one of them is Partly. The finding promised "done or partly".
4. **Heel-raise test (high): FIXED.** "Last time: 23 (26 Oct)" is under each box. "Test today" is gone. The Progress card has a chevron and "+2 since 17 Sept", "Right is 74% of left", and opens the same history list (bars per test, L and R). It is a list, not a chart, but it answers the question.
5. **Evening sheet did not open (medium): FIXED.** No sheet at all. The card is on Today at 19:30 and the answers are on it.
6. **Two sheets stacked (medium): FIXED.** Nothing stacks. At 19:30 with an unanswered morning, the arch card and the evening card are simply both on the page.
7. **"Clean run?" asked twice (high): FIXED.** Asked once, next morning, on the arch card ("Yesterday's run (step 5): clean?"). The run sheet says "Clean or not is asked tomorrow morning, once you know how the arch feels." Plain and good.
8. **Run log sheet too tall, comment hidden (medium): FIXED.** Status, arch during, step, one short line, Add a note, Clear, Close: all fit at 800 px with no scroll. No more "niggle".
9. **Selected state of Clean / Not clean almost invisible (medium): FIXED.** Selected is now a solid fill (green for a pain word, black in sheets). I did not measure contrast.
10. **Missing yesterday, nothing says so (high): FIXED.** A quiet row "Yesterday: ... not logged · Leave it / Fill in". Past days now say "How was the arch that morning?", "How was that day?", "Plan 1 not logged", and the title shows "6 Oct · yesterday · Back to today". Remaining: the banner wording is confusing (see new problem 5).
11. **Arch sheet hides the plan; "Later" looks like the main action (low): FIXED.** No sheet. The plan is visible once the arch card folds.
12. **Small wording and layout glitches (low): PARTLY.**
    - Fixed: the note hint now fits the session ("e.g. only the chin nods, short on time"); decimal point everywhere ("e.g. 72.4", "5' walk"); the "This week" counter is only on Progress; the toast moved to the bottom (but see new problem 3).
    - Not fixed: the week-strip dots still have no legend (two dots per day, filled/half/empty, no explanation). "Evening · Test" label unchanged.

## New problems, ranked

### 1. Partly + short note is still 6 taps (medium)
Partly on the row logs at once but offers no way to add the note. The note is behind row > Edit > Add a note > Close > Today. The note is the reason for choosing Partly, and adherence is the weak spot. Suggestion: after Partly, the toast gets a second action "Add note" that opens the note box directly; or a small "Note" link on the row itself.

### 2. Plan header counts Partly as done (medium)
"2 of 2 done" with one Partly and one Done (Friday); "Skip all" gives "0 of 2 done". Suggestion: "1 done, 1 partly", or "2 logged".

### 3. The toast covers the next thing Pedro wants to tap, and Undo is small (medium)
The bottom toast stays 3.3 s and sits right over the next row's Done/Partly/Skipped buttons or over the "Hands tingling" answers (screenshots 05a, 35, 58). A hurried one-thumb user taps the next row straight away and hits the toast. Undo is 47 x 24 px, below the 44 px rule. Two toasts can stack ("Run A: done" and "Log cleared" were both shown). Suggestion: put the toast above the tab bar but let the buttons stay tappable (pointer-events through the body), make Undo 44 px high, and replace, not stack.

### 4. The coach card takes the top 300 px every morning until "Got it" (medium)
On Thu and again on Fri it sits above the arch card and pushes the plan out of the first screen. At 19:30 it is still there. Only after a tap on "Got it" does it fold into a row, so it adds a tap for no gain. Suggestion: show it in full once (first open of the week), then fold it by itself.

### 5. "Yesterday: 1 session, the morning and the evening not logged" is hard to read (low-medium)
It reads as if the two sessions were "the morning" and "the evening". It means: 1 session plus the morning and evening check-ins. Suggestion: "Yesterday not logged: Pilates, arch, evening check-in."

### 6. "Add arch pain" does not add arch pain (low-medium)
On a logged run or test it is blue like an action, but it opens the session screen, where Pedro must find Edit. Also "arch pain" in the evening, after a run, is a different word from "Right arch, during". Suggestion: open the log sheet straight on the arch question, label "Arch during?".

### 7. Changing a logged status takes 5 taps (low)
After a Partly, the row has no buttons. To change it to Done: row, Edit, Done, Close, Today. The toast Undo only helps for 3 s. Suggestion: tap on the ring or the status word reopens Done/Partly/Skipped on the row.

### 8. Test row on Today has only "Enter results" (low)
No Partly/Skipped on the row for the heel-raise test; skipping it needs row > Skipped (2 taps). Also the status bar at the bottom shows "L 25 reps" until the Right box loses focus; the values save on blur, and tapping "Today" with the cursor still in the Right box did save both (I checked the data). I did not test the phone's back gesture with the keyboard open.

### 9. Done is outlined in blue on every unlogged row (low)
It looks like it is already selected or the recommended answer. A careless tap logs a full Done when Pedro did half. Suggestion: all three buttons look the same.

### 10. Today stays scrolled halfway after coming back from a session screen (low)
After Partly on the session screen, Today was scrolled down so that the header and week strip were off-screen (screenshot 14). Suggestion: scroll to top on return.

### 11. Unanswered arch card in the evening still says "this morning ... first steps out of bed" (low)
At 19:30 it is odd but harmless. A "Skip" or a line "You can still answer for this morning" would be calmer. Also the "Skip all" link sits next to "2 to do" and skips every session with one tap (Undo exists).

## What works well now
- The Today screen is the whole app for a weekday: arch, neck, evening check-in in 1-2 taps each, no sheets.
- The folded summary "This morning: Arch Mild, Run clean, Edit" is calm and shows what was saved.
- Heel-raise: last time under each box, no Save, history one tap away, same history from Progress.
- Run: one tap Done, the step is already there, and "clean" is asked once, in the morning, with a plain sentence.
- Past days read right ("That morning", "How was that day?") and "Fill in" jumps to the day that needs it, then "Back to today".
- Tap targets are 44 px or more everywhere I measured, except Undo (24 px).
