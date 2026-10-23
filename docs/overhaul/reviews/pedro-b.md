# Review: Pedro B, "bad body days" (360 x 800, demo "before" app)

Scenarios driven: `flare`, `sick`, `bike`, `gap`. Screenshots are in `/tmp/claude-0/pedro-b/`.
The app is calm in look and tone. The main problem is the opposite of alarming: on bad days it
is too quiet, and the headline numbers can say "Mild / OK zone" while the chart shows a flare.

## Findings, ranked

### 1. Headline says "Mild / In the OK zone" in the middle of a flare (high)
- **Where:** Progress -> Arch / Neck / Hands detail (`pain-detail.tsx`, `trends.ts` `zoneText`) and the dashboard cards.
- **What happens:**
  - `flare`, after answering Severe: the Arch detail says "Mild, average last 4 weeks, Same as the 4 weeks before, In the OK zone" with a green dot. The chart right below shows Moderate then Severe on the last two days.
  - `bike`, with a week of Moderate and Severe necks: the Neck detail says "Mild ... In the OK zone". The arrow beside it says "Worse".
  - The dashboard Arch card also says "Mild", green dot, after a Severe morning.
  - The dashboard Neck card says "Moderate" while its own detail says "Mild" (2 weeks vs 4 weeks, never explained).
- **Why it matters:** Pedro wants to know whether to hold back. A green "OK zone" tells him no. After a week of Moderate to Severe necks it reads as false comfort, and it contradicts the chart. In a calm app, being quiet and being wrong are different things.
- **Suggestion:**
  - Lead with the recent state: "Last 3 days: Moderate to Severe" (or "Latest: Severe, today").
  - Show the long average smaller and labelled "4-week average".
  - Base the dot and zone on the worse of (latest, 7-day) values, not only the long average.
  - Use the same window on the dashboard card and in its detail, or label both.

### 2. A Severe morning changes nothing; no guidance on whether to hold back (high)
- **Where:** `flare`, after answering Severe: Today, session screens, Run B (`morning-check.tsx`, `plan-card.tsx`, `session-screen.tsx`).
- **What happens:**
  - The drawer saves ("Saved"), shows a red "Severe" chip and closes. There is no sentence like "Take it easy today" or "Tell your coach".
  - Today still shows the full plan. Pilates still says "Tell them about the arch and the neck".
  - Sat 17 still shows Run B, Step 4, the same step as the run that started the flare, with no warning. The text "Stop if the arch goes above 3/10" does not mention that today it was Severe.
- **Why it matters:** This is the exact moment Pedro is worried. The app collects the answer and gives nothing back, so he does not know whether to hold back.
- **Suggestion:**
  - After Moderate or worse, show a calm line under the Morning card and on the run screen: "Arch is sore today. Keep it easy; your coach will look at the run step."
  - Mark planned runs with "Your coach will check this one" (not an automatic change; the app must never auto-advance).
  - Fix the Pilates hint so it matches the day.

### 3. Hard-to-read "Run ladder" rules for a worried non-native reader (medium)
- **Where:** Progress -> Run ladder drawer (`run-ladder.tsx`, `lib/ladder.ts`).
- **What happens:**
  - The drawer shows Step 4 "Now" and the rules paragraph: "Clean = no arch niggle, or <= 3/10 during that's back to baseline next morning. Up a step after 2 clean runs in a row; a niggle that lingers holds the step; over 3/10 drops one."
  - "Niggle" and "baseline" are hard for a non-native reader, and the sentence is dense.
  - The dashboard card says "0 clean runs in a row" on a flare day, with no explanation of what happens now.
  - The "3/10" scale is not the 5-word scale used everywhere else in the app.
- **Suggestion:**
  - Rewrite in short lines: "Up a step: 2 easy runs in a row." "Stay: some soreness stays the next morning." "Down a step: pain above Mild during the run."
  - Add a line for a flare: "After a bad day your coach decides the next step. Nothing changes by itself."
  - Use the five words, not 3/10.

### 4. Bad-day panel: honest counts, but not in plain words, no small-sample warning (medium)
- **Where:** Neck and Hands detail, "What goes with a bad day" (`pain-detail.tsx`).
- **What happens:**
  - "Days with a bike ride over 30 min: 5 of 13 days / Days without one: 1 of 11 days / Days the hands tingled: 6 of 8 days".
  - The counts are honest, and the note "A pattern to discuss with your coach, not a diagnosis" is good.
  - But the line does not say what the numbers mean. Pedro has to work out that "5 of 13" means "5 of the 13 bike days were Moderate or worse".
  - Runs and long PC days, the other two things he named, are missing. Only bike is shown.
  - There is no small-numbers note. "6 of 6 days" (Hands, neck Moderate+) looks certain but is tiny.
  - "Days the hands tingled" on a neck-pain panel is not a cause, only a thing that happens the same evening, and nothing says so.
  - After a week of Moderate/Severe necks the section still looks identical in weight to a calm week.
- **Suggestion:**
  - Add one plain sentence above the bars: "Neck was Moderate or worse on 5 of 13 days with a long bike ride, and on 1 of 11 days without one."
  - Add "Few days, so treat it as a hint" when the smaller group has fewer than about 10 days.
  - Add a "Runs" row.
  - Label the tingling row "At the same time".

### 5. Today's rides are missing, so today counts as a "day without a bike ride" (medium)
- **Where:** `bike` Fri 6 Nov evening; Activities tab and the neck chart.
- **What happens:**
  - The Activities list stops at Thu 5 Nov ("Last synced today 07:00 / From the watch, every morning"). The evening check-in of 6 Nov (Moderate) has no bike dot in the chart.
  - Today's neck answer lands in "Days without one", which dilutes the bike effect.
  - Pedro's commutes are real that day; the watch has not synced yet.
- **Suggestion:** Leave days after the last sync out of the bike comparison, or add "Today's rides arrive tomorrow morning". Same for "Hands tingled" when today is the only day.

### 6. After a gap, Progress reads as current state and as "OK" (medium)
- **Where:** `gap` (Mon 16 Nov, 9 days of holiday): Progress dashboard and Neck detail; Run ladder card.
- **What happens:**
  - The dashboard Arch card says "None" with a green dot and "Not enough answers yet", based only on today's single answer. "None" looks like a result.
  - The Neck detail 4W still says "Mild, Worse than the 4 weeks before, In the OK zone". The chart leaves 09/11 to 16/11 blank with no note that no answers were given on holiday.
  - The Neck card bars from before the holiday are shown as "2 wk ago ... today" with a long empty tail, which reads fine, but the headline "-" next to bars in red/orange is confusing.
  - The Run ladder card still says "Step 5 of 6, 5 clean runs in a row" after 9 days without running. Nothing suggests that after a break the step may need a look.
  - Today shows nothing about being back (a plain "Welcome back, nothing to catch up" would help).
- **Suggestion:**
  - Hide the headline word when fewer than about 3 answers exist; show "Not enough answers yet" alone.
  - Shade "no answers" ranges in the chart with a short note.
  - On the Run ladder card add "No run for 9 days. Ask your coach before the next one".
  - Add a one-line welcome-back on Today.

### 7. Logging many skipped sessions costs 5 taps each; no way to say "I was ill" (medium)
- **Where:** `sick` (Fri 2 Oct): Today -> session -> `log-drawer.tsx`.
- **What happens:**
  - To log a skipped session: tap the session (1), "Log session" (2), "Skipped" (3), "Save" (4), back arrow (5). Reaching another day adds one more tap.
  - A sick week with 9 skips would cost about 45 taps. There is no "skip the whole day" or "I was ill this week" action.
  - Skipped is on the 3-button toggle, not a one-tap action.
  - After Save you stay on the session screen with "Skipped / Edit"; you do not return to the list.
- **Suggestion:**
  - Make "Skip" a swipe or a button on the plan row (one tap), with an optional reason ("ill", "tired", "no time").
  - Add "Skip the rest of today" and "Mark this week as rest".
  - After Save, go back to the list.
  - Let the coach read the reason ("ill") rather than guess from skips.

### 8. Sick week feels mildly like a score of failure (medium)
- **Where:** `sick`: Today and Progress "This week".
- **What happens:**
  - The big "0 of 14 sessions done" and "9 skipped" are the loudest things on the week card. Skipped is grey, not red, which is good.
  - The Neck card shows "None" as a headline with only a few answers, next to "Not enough answers yet". It is not clear whether "None" is good news or missing data.
  - Today shows "0 of 2 done" even though both are "Skipped".
- **Suggestion:**
  - When a week is mostly skipped, say "Rest week" and make the number smaller.
  - Show "0 of 2" as "2 skipped".
  - Do not show a headline word when there are too few answers.

### 9. Evening card wraps into three lines when answered (low)
- **Where:** Today, Evening card after `bike` answers (`check-card.tsx`).
- **What happens:** "Neck / Moderate / Hands A lot" is laid out as three stacked lines, with two dots, and the card is taller than the Morning card. "Neck" and "Moderate" are split onto two lines.
- **Suggestion:** One line per area: "Neck: Moderate", "Hands: A lot", same height as Morning.

### 10. Toast overlaps the top of the screen (low)
- **Where:** All screens after saving (the "Saved" toast, full-width at the top).
- **What happens:** The toast covers the page title and the back arrow for a few seconds, e.g. over "Today / Friday 16 October" and over the session header "MORNING - NECK". The back arrow cannot be tapped under it.
- **Suggestion:** Show it low (above the bottom bar) or shorten its time. It is also unnecessary when the chip already changes.

### 11. Chart readability and wording (low)
- **Where:** Neck and Hands detail.
- **What happens:**
  - The Bike and Hands strips under the chart use 4 to 5 px squares; on 3M and 6M they merge into bars.
  - There is no legend for colours (blue bike, purple tingling, orange neck).
  - On 6M the chart is about 70% empty because there is only about 2 months of data, yet the headline says "Average, last 6 months".
  - The 5-word scale is labelled "Worst" on the zone bar and chart where the rest of the app says "Unbearable". "Mod." is abbreviated.
  - The Hands 4W chart has a blank band of about 150 px between the date range and the plot.
  - Dates such as "10/10 - 06/11" are fine for Europe but hard to scan.
- **Suggestion:**
  - Use a bigger dot and a one-line legend.
  - Cut the range to the data that exists ("Since 22 Sep").
  - Use "Unbearable" everywhere.
  - Remove the empty band.

### 12. Activities: no link to how Pedro felt, "load" is unexplained (low)
- **Where:** Progress -> Activities (`activities-list.tsx`).
- **What happens:**
  - A flat list: "Bike / Thu, 5 Nov / 38 min / 12.2 km, 119 bpm, load 26". Two bike rides a day look like duplicates (there and back), but that is not said.
  - "load" has no explanation.
  - The neck answer for that day is not shown anywhere on this list, so Pedro cannot connect a ride with a bad evening.
  - The list is long and there is no day grouping.
- **Suggestion:**
  - Group by day with a small neck/hands chip for that evening.
  - Add a short "What is load?" line.
  - Group the two commutes ("Bike x2, 78 min").

## What works well
- **Check-ins are fast.** Evening: 2 option taps plus Done (3 taps). Morning: 1 option tap plus Done. All targets are 44 px or more.
- **Calm style.** Pain colour always comes with its word, and "A pattern to discuss with your coach, not a diagnosis" is the right tone.
- **Readable charts.** The Arch chart shows the flare clearly, and the "Run day before" strip is a smart idea.
- **Honest comparisons.** "Not enough answers yet" and "Not enough to compare" appear instead of invented verdicts.
- **Skipped is neutral.** Grey, not red.
- **Practical touches.** The heel-raise card shows "from 21" and "Next test in 3 days", and the 4W/3M/6M switch is quick and the content updates immediately.

## Summary
1. Biggest problem: the long-average headline says "Mild / OK zone" while the chart shows a Severe flare (Arch, Neck, dashboard).
2. After a Severe morning nothing changes: no hold-back message, and the planned step 4 run stays.
3. The bad-day panel needs one plain sentence, a small-numbers warning, and a runs row; today's rides are missing before sync.
4. After a gap or in a sick week the app shows no welcome-back or rest-week state, hides no too-thin headlines, and skips cost 5 taps each.
5. Small layout bugs: a 3-line Evening card, and the "Saved" toast covering the title and back arrow.
