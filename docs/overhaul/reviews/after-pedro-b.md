# Re-test: Pedro B, "bad body days" (360 x 800, demo "after" app, port 4175)

Scenarios driven: `flare`, `sick`, `bike`, `gap`. Screenshots are in `/tmp/claude-0/pedro-b2/`.
The new app is clearly better on a bad day: it now says something back, the headline leads with the
recent state, and the check-ins are cards on Today with no sheet that opens by itself. What is left is
mostly mixed signals (a red dot next to the word "Mild", "Stop zone" next to a green "Mild") and a few
places where a bad day still gets no reply.

## Walk-through, in short

- **flare, answer Severe** (1 tap): the card turns into "This morning: Arch, red dot, Severe, Edit", and a
  line appears: "Arch is sore today. Keep it easy, and stop an exercise if it goes above Mild. Your coach
  decides the next run step." Moderate and Unbearable show the same line. Mild shows nothing. Calm, good.
  The plan below does not change. Sat 17 still shows Run B, Step 4, "planned by your coach", with no
  flag. Pilates still says "Tell them about the arch and the neck".
- **flare, Progress -> Arch**: top card says "Last 7 days, red dot, Mild, usual, latest Severe (Fri), Stop
  zone". Below, "Average, last 4 weeks, green dot, Mild, About the same". The chart shows Moderate then
  Severe on the last two days.
- **sick**: from the "Yesterday: 1 session ... not logged" card, "Fill in" (1) then "Skipped" (1) = 2 taps
  per session, and the app stays on that day (no extra back tap). On a Today row it is 1 tap. "Skip all"
  exists. A toast "Neck micro-dose: skipped / Undo" shows low on the screen. From a session screen,
  Skipped saves and goes back to the list by itself. It feels much lighter than before (was 5 taps).
  It still feels like a failed week on Progress: a big "0 of 14 done / 9 skipped".
- **bike, evening check-in**: Neck Moderate (1 tap) + Hands A lot (1 tap) = 2 taps, no Done button. The
  Evening card is two tidy lines ("Neck Moderate / Hands A lot"). Nothing is said back.
- **bike, Progress**: top sentence "Neck and hands worse than the week before. Arch better." Neck card
  "Moderate, Usual, last 7 days, Worse than the week before" with a red/orange bar strip. Hands card "5 of
  7 days". Detail pages have 4 weeks / 3 months / 6 months, a legend ("Bike over 60 min that day",
  "Hands tingled") and "What goes with a bad day" with a plain sentence per row.
- **bike, 3 months / 6 months**: both read "Average, since 31 Aug, Not enough answers to compare" and
  look the same (there are only about 2 months of data). Honest.
- **bike, Activities**: grouped by day, each day has "Neck Severe / Hands A lot" chips, and a footnote
  explains load. No row for Fri 6 Nov, but the header says "Updates at 07:00 and 20:00".
- **gap**: Today shows a "Welcome back: 10 days without the app. Past days stay as they are: no need to
  fill them in. Start with today." card. Coach note: "Restart at step 4, not 5, after the break." Progress:
  Neck "Not enough answers yet, 0 of the last 7 days answered. It shows from 3." The heel-raise card says
  "Next test Thu, 19 Nov (in 3 days)".

## My earlier findings

| # | Earlier finding | Status | Why |
|---|---|---|---|
| 1 | Headline "Mild / OK zone" during a flare | **PARTLY** | The big word is now "Last 7 days" with "latest Severe (Fri)", and the 4-week average is smaller. But the dot is red next to the word "Mild", "Stop zone" is unexplained, and the average card below is still a green "Mild" (see new #1, #2). |
| 2 | Severe morning changes nothing | **PARTLY** | New calm line on Today, with "Your coach decides the next run step". But Run B (Sat) and Pilates are unchanged, there is no line for neck or hands, and Unbearable gets the same words as Moderate (new #3). |
| 3 | Run ladder rules hard to read | **FIXED** | Short lines: "Clean run ...", "Up a step after 2 clean runs", "Pain above Mild during the run: one step down", "Your coach decides ... Nothing changes by itself." Uses the five words. |
| 4 | Bad-day panel: no plain sentence, no small-numbers note, no runs | **PARTLY** | Now "Neck was Mild or worse on 5 of 13 days with ..., and on 1 of 11 without", "More often / About the same", runs and strength rows, "Small numbers: a hint ..." note. Left: "Mild" counts as a "bad day" (new #5), 100% / 0% bars from 4 days. |
| 5 | Today's rides missing, today counted as "no bike" | **PARTLY** | Counts are the same before and after I answer tonight (23 answers), so today is left out. Activities still has no Fri row and no "today's rides arrive at 20:00" line beside the list. |
| 6 | After a gap Progress reads as current / OK | **FIXED** (small leftover) | Welcome-back card, "Not enough answers yet ... shows from 3", no headline word. Leftover: the ladder card has no "no run for 12 days" line; the coach note carries it (new #8). |
| 7 | Skipped sessions cost 5 taps each | **FIXED** | 1 tap on Today, 2 from the session, "Skip all", Undo toast, auto-return to the list. No reason ("ill") can be added by Pedro, but data with reasons shows nicely ("Flu, stayed in bed"). |
| 8 | Sick week feels like failure | **NOT FIXED** | Progress "This week": big "0 of 14 done, 9 skipped". Today header "0 of 2 done" when both are Skipped. Neck "None" confusion is fixed. |
| 9 | Evening card wraps to 3 lines | **FIXED** | Two clean lines, same height as the Morning card. |
| 10 | "Saved" toast covers title and back arrow | **FIXED** | Toast is low, above the bottom bar, with Undo. (It can cover the Neck buttons of the check-in card below; new #9.) |
| 11 | Chart readability | **PARTLY** | Legend added; 6M says "since 31 Aug"; "Unbearable" is used. Strips under the chart are still tiny and merge into a bar on the last days; Hands chart still has an empty band (about 80 px) above the plot; 3 months and 6 months look identical. |
| 12 | Activities: no link to feeling, "load" unexplained | **FIXED** (small leftover) | Grouped by day, Neck/Hands chips, "Load: the watch's training load ..." footnote, "Run - step 5". The footnote is at the very bottom of a long list; two bike commutes are still two rows. |

## New problems, ranked

1. **Red dot beside a calm word, "Stop zone" without a reason (high).**
   - Where: Progress -> Arch / Neck detail, top card ("Last 7 days"); Overview Arch card on flare.
   - What: Flare: red dot + "Mild" + "latest Severe (Fri)" + "Stop zone". Bike: red dot + "Moderate" + "Stop zone", while the Overview Neck card shows the same "Moderate" with an orange dot. Pain colour should come with its word; here the colour and the word disagree, and the same word has two colours.
   - Why it matters: "Stop zone" is the most alarming phrase in the app and nothing says what to stop (running? the bike? the exercises?). A worried Pedro will read it as a medical order. It also contradicts the card right under it.
   - Suggestion: colour the dot by the word shown; if the colour comes from "latest", write "Latest: Severe (Fri)" in that colour as the headline. Replace "Stop zone" with a sentence: "Pain is high. Keep it easy and tell your coach."

2. **Alarm and false comfort on the same screen (high).**
   - Where: Neck / Arch detail, second card.
   - What: below the red "Stop zone", "Average, last 4 weeks, green dot, Mild, Worse than the 4 weeks before". After a week of Moderate-Severe necks the 4-week average is still a green "Mild". The word "Worse" and the green dot say opposite things.
   - Suggestion: no green dot when the comparison says "Worse" (use a neutral dot, or an orange one), or drop the dot on the average card.

3. **No reply to a bad neck or hands, and one reply for every arch level (high).**
   - Where: Today, after the evening check-in (bike: Neck Severe, Hands A lot) and the morning check-in (Unbearable).
   - What: only the arch gets the calm line. Neck Severe + hands "A lot" gets nothing. Arch Unbearable gets the same line as Moderate ("stop an exercise if it goes above Mild" makes no sense when it is already Unbearable).
   - Why: tingling "A lot" and an Unbearable arch are the two answers where Pedro most needs a clear next step. Silence reads as "fine".
   - Suggestion: one short line for neck Severe+ or hands "A lot": "Neck and hands are bad today. Rest them, and tell your coach tomorrow." Separate wording for Unbearable: "Do not train the arch today. Tell your coach." Keep it calm, no new colours.

4. **The planned run is not linked to the flare (medium).**
   - Where: Sat 17 -> Run B (`session-screen.tsx`), Pilates screen.
   - What: Run B shows Step 4, "planned by your coach", "Stop if the arch goes above Mild". Nothing says that Friday was Severe. Pilates hint is still the generic one.
   - Suggestion: on a planned run, if the last arch answer was Moderate or worse, add "Your coach will check this run first." (text only, no change of the step, the app never auto-advances).

5. **"Bad day" means "Mild or worse" (medium).**
   - Where: "What goes with a bad day" (Neck, Hands, Arch).
   - What: Arch: "Mild or worse on 4 of 4 mornings with a run the day before, and on 15 of 16 without": Mild is Pedro's normal morning, so the row says nothing (94% vs 100%). Neck: Mild is also counted as bad, and the dark bars read "100% / 0%" from 4 days. Hands: `"neck mild or worse"` is lower-case inside quotes, awkward.
   - Suggestion: for the arch use "Moderate or worse"; hide a row when the smaller group is under about 5 days or show "only 4 days"; fix the quote wording ("a day with Mild or worse neck").

6. **Sick week still shouts "0 of 14 done / 9 skipped" (medium).** (earlier #8, not fixed)
   - Where: Progress "This week" and Today "Plan" header.
   - Suggestion: when most sessions are skipped, say "Rest week" and make the number small; show "2 skipped" instead of "0 of 2 done"; let Skipped carry an optional reason chip ("ill").

7. **Coach card and ladder do not agree after a flare (medium).**
   - Where: flare, Today.
   - What: the coach card "Up to step 4 ..." stays above the red "Severe" card. Not a bug (the app must not change the plan) but the two sit together without a link.
   - Suggestion: covered by #4; also the Progress ladder card could say "Last arch: Severe (Fri)" under the step.

8. **Gap: ladder card has no break note; bar and step disagree (low).**
   - Where: Progress -> Run ladder card.
   - What: "Step 4 of 6, last run step 5, clean not decided yet" with 5 filled segments in the bar, so Step 4 shows 5 bars. After 12 days without a run there is no "No run for 12 days". "10 days without the app" on Today vs "9 days" in the scenario brief: please check the count (last entry 6 Nov to 16 Nov is 10).
   - Suggestion: fill the bar to the planned step; add "No run for 12 days. Your coach decides." when more than about 10 days.

9. **Undo toast can cover the answers (low).**
   - Where: Today, a past day, tap Skipped on a session.
   - What: the toast sits right over "How was that day? / Neck" buttons for about 4 seconds. A second tap lands on the toast.
   - Suggestion: shorter time, or move it just above the bar and make the page add bottom space.

10. **Smaller things (low).**
   - "Usual" (Progress cards) vs "usual" (detail) is a vague word for a non-native reader: "Typical" or "Most days".
   - Hands detail: the empty band above the plot is still there; the chart strips under the plot (4-5 px marks) merge on the last days.
   - 3 months and 6 months are identical until more data exists: hide 6 months or say "Same as 3 months, only 2 months of data".
   - Activities: no "today's rides arrive at 20:00" next to the list; load footnote is at the bottom.
   - Week strip dots (`oo`) are tiny and the meaning of half-filled / grey / empty is not explained.

## Still alarming
- "Stop zone" with a red dot (#1), with no sentence on what to stop.
- A red "Severe" chip plus a plan that still shows everything as normal (#4): the app says "keep it easy" but still lists a 34-minute Step 4 run for tomorrow.

## Still falsely reassuring
- The green "Mild" 4-week average sitting under a "Worse" arrow and a week of Moderate-Severe necks (#2).
- Hands "A lot" and neck Severe answered tonight: no reply at all (#3).
- "0 of 8 days without a bike ride": the panel is honest with its small-numbers note, but the "Without 0%" bar looks like proof. The note should come before the bars, not after.

## What works well now
- Check-ins are cards: 1 tap (arch) or 2 taps (evening), no sheet, no Done button.
- The Severe arch reply is calm and short, and says "your coach decides".
- Ladder rules are plain English and say "Nothing changes by itself".
- Welcome-back card and "It shows from 3" remove all the false "None / Mild" headlines after a gap.
- Skip is now fast (1-2 taps, Undo, Skip all) and neutral grey.
- Activities by day with Neck / Hands chips connect the ride to the evening.
- The bad-day panel now says what the numbers mean in one sentence.

## Summary
1. Big improvement: calm reply to a Severe arch, plain ladder rules, welcome-back, 1-2 tap skips, two-line evening card, low toast.
2. Biggest remaining problem: mixed signals on the Arch/Neck detail: red dot + "Mild", unexplained "Stop zone", green average under "Worse".
3. Neck Severe / Hands A lot / arch Unbearable get no (or the wrong) reply; the planned Run B and Pilates do not mention the flare.
4. Sick week still shows "0 of 14 done / 9 skipped" and "0 of 2 done" for skipped days.
5. Small: "Mild or worse" as the bad-day line (useless for the arch), tiny chart strips, empty band on Hands, 3M = 6M, ladder bar vs step.
