# Coach simulation: COACH.md followed in the demo

Method: read the demo tables with `pisadaDemo.db()` and filtered in JS like the "Useful queries"; wrote with `pisadaDemo.insert()`. Screenshots in `/tmp/claude-0/coach/` (s1-*, s2-*, s3-*). Scenarios: `ladder-up` (Sun 27 Sep 18:00), `bike` (Fri 6 Nov 19:30 to Mon 16 Nov), then odd rows.

## (a) The three summaries I would send Pedro

**1. Sunday 27 Sep (week 21–27 Sep).** I can read the watch but nothing from the app: no session logs, no evening check-ins, and only one morning answer (21 Sep, Mild) for this week. So I can't judge the week.
- Watch: 9 bike rides of about 6.5 km, one run on Wed 23 Sep (36 min, 4.8 km, avg HR 143), a 14 km hut hike on Sat 26 Sep.
- Week before (14–20 Sep, logged): 13 of 14 sessions (10 done, 3 partly). Arch mornings Mild on 6 of 6 days. Both runs at step 2 clean. Neck Moderate once (16 Sep, after the bike), hands "A lot" the same day. Heel-raise test: left 21, right 12.
- Plan: I need your answer on Wed's run (step 3): was it clean? It is only your first run at step 3, so **step 3 stays** (up after 2 clean runs in a row). Next week stays as planned: Run A Wed 30 Sep, Run B Sat 3 Oct, both step 3 (48 h+ apart). Extra: heel-raise test Fri 2 Oct morning (written). The review for Mon 28 Sep already existed, so I did not write one.

**2. Friday 6 Nov (week 2–6 Nov, before the holiday).**
- Done: 5 sessions, partly 3, skipped 1 (Balance & hips); Pilates is tonight. Run A at step 5 was clean: your first clean run at step 5.
- Arch mornings: None on 4 days, Mild on 1. Calm.
- Worry: neck Severe on 2 evenings and Moderate on 2 (4 days in a row at 4+). Hands tingling "A bit" to "A lot" (none last week). The rides doubled: 11–13 km each way against 6–7 km before.
- Weight average 72.9 kg, the same as last week.
- Plan for Mon 16 Nov, after 10 days off: both runs at **step 4**, not 5 (a break is not in the rules, so this is my judgement; please OK it). Neck micro-dose every morning. Please try the shorter bike route on two days. Heel-raise test the week after.
- Written: 14 sessions for 16–22 Nov and one review row.

**3. Odd rows (no summary).** Test rows only; see (c).

## (b) Where COACH.md was unclear, ambiguous or wrong (ranked)

1. **medium: `reviews.week_start` is ambiguous.** Step 4 says "that Monday" (next week); the table section says "one per week (week_start = Monday)". The simulated coach uses the Monday of the week being planned, with a summary of the week before. A pre-holiday check-in breaks this: there is no row for Mon 9 Nov, so a lookup "latest review at or before 9 Nov" returns the 2 Nov row. Say: "week_start = the Monday the decisions start; the summary covers the 7 days before it", and say what to do for a gap week.
2. **medium: no insert example for `reviews`** (the other tables have one). Give `insert into reviews (week_start, summary, decisions, user_id) values (...)`. Also say whether a second row for the same `week_start` is allowed (the table has no unique rule written down) and how to fix a wrong one (`update`).
3. **medium: no rule for a break.** Nothing says what step to use after 10 days without running. Add: "after more than 7 days without a run, restart one step lower (or hold if only 1 clean run); ask what he did on holiday".
4. **medium: reading the week needs 5+ separate queries, and the "week at a glance" query misses most of it.** It has no check-ins, no watch rows, and no previous week. Add one ready query for weekly averages of arch (morning), neck and hands (evening) for the last two weeks, and one for the watch rows (`activities` where `source='intervals'`, by date). I also had to guess the "last 7 days" window: say "Monday to Sunday of the week just ended".
5. **medium: when to run the check-in.** At 18:00 / 19:30 the evening check-in of the day, the 20:00 sync and the day's logs are missing. COACH.md should say: run it Sunday after 20:30, and read `sync_status.synced_at` to know how fresh the watch data is.
6. **medium: joining the app run and the watch run** (by `date` and `sport='run'`) fails with two runs on one day, or with a watch run that has no app row (23 Sep). Say what to do: ask Pedro, and never guess `clean`.
7. **low: `slot`**: the doc says `'am'`/`'pm'`; the app shows "Morning"/"Evening". Two sessions in the same slot are allowed (Sunday neck + mobility) but the order within a slot is not defined.
8. **low: dose wording.** "Right side +1 set": the base dose is not in COACH.md (it lives in the catalog), so I wrote "right side 4 sets" from a guess. State the base doses, or say "write the dose in `instructions`".
9. **low: decimals in `run_steps.label`.** The seed uses "1,5′ walk" (comma) in an English app. Say: use whole minutes or a point.
10. **low: `user_id`** is clear in Golden rule 1, but only some examples show it; every example should.
11. **low: the cadence of tests** ("test dates") is not given anywhere (monthly?).

## (c) What the coach writes that the app doesn't show, or shows wrongly (ranked)

1. **high: `reviews` are never shown.** `review()` exists in the data layer (`src/data/supabase.ts:240`, `api.ts:41`) but no component calls it. Pedro never sees the summary or the decisions, which is the reason for the whole weekly ritual. Show the latest review at the top of Today on Monday, or on Progress.
2. **high: a run with no `run_step` looks planned.** Run D showed "Run–walk · step 5 · ~35 min" on Today and a full "Step 5" card on the session (`session-time.ts:45`, `supabase.ts:280` fall back to the last logged step). Pedro thinks he has a plan, but the watch gets nothing (the sync skips it). It also silently pre-fills the log with step 5. After a holiday that is the wrong step. Show "Step not set yet" and no workout card; keep the fallback only as a hint in the log.
3. **medium: an unknown step (9) shows "Run–walk · step 9"** with no label, no minutes, and an empty "Ladder step" box in the log. Show "Step 9 is not in the ladder".
4. **medium: the run ladder card on Progress says "Step 5 of 6, 5 clean runs in a row"** (`progress.tsx:255`: last logged step, all clean runs counted together). After I planned step 4, Pedro sees step 5 and "5 in a row"; the rule is 2 clean runs at the same step. Show the planned step and the clean count at the current step.
5. **low: unknown exercise slug** (`nordic_curl`): silently dropped, with no warning to Pedro or to the coach. The run kept its other figure ("Chin nod") and the "Start: one exercise at a time" button. Fine for Pedro; but the coach cannot learn it, so COACH.md should say "check the app after writing".
6. **low: Today card says "~36 min", the session screen says "~34 min"** for a run with one extra exercise (the figure adds time on one screen only).
7. **low: a pilates session in `am`** displays correctly ("Morning · Pilates", "Class with your teacher · ~60 min"); no problem. The "~60 min" is a fixed guess, not from the plan.
8. **low: a holiday day** shows "Nothing planned" plus the "How's the arch?" and "How was today?" cards. Nothing says "holiday". A one-line note field per day (or showing the review's decisions) would help.
9. **low: video thumbnails** showed a broken image in the demo (no internet in the sandbox); probably not an app bug.

What displayed correctly: every session of the 16–22 Nov week (kind, "Morning/Evening · KIND", titles, instructions, figures, step label "Step 4 — 3 × (7′ jog / 1,5′ walk) · ~34 min", video link with duration, "3 exercises + 1 video · ~30 min", the test Left/Right boxes for `sl_heel_raise_test`, the week strip dots).

## (d) Suggestions

COACH.md:
- Define `week_start` once, with an example row and an `insert`.
- Add the weekly-average query, the watch-rows query, and "run the check-in after 20:30; read `sync_status`".
- Add a "returning from a break" rule and the test cadence.
- Say what happens with no `run_step` (not sent to the watch, and what the app shows).
- Add a "before you tell Pedro it's done" checklist: every run has a `run_step` that exists in `run_steps`, every slug is in the catalog, no two runs within 48 h, one review row.
- Say what to do when the logs for the week are missing: ask Pedro, do not infer.

App:
- Show the review (Monday card on Today).
- Show "not set yet" for runs without a step; label unknown steps.
- Make the ladder card show the planned step and the clean count at that step.
- Small: mark rows the coach added with an unknown slug, in a debug line the coach can see (or a `plan_issues` view), so the chat can self-check.

## Demo notes (for whoever runs this again)
- `insert()` rows get no ordering guarantee; `moveTo` re-adds the simulator's own plan and review for 16 Nov (created 15 Nov 17:00) next to mine, giving 14 duplicate sessions. I removed the simulator's rows from the in-browser state (not the repo) before looking at the week.
- The clock does not create Pedro's own logs, so the Sunday 27 Sep check-in had no logs for its week. Real weekly check-ins will not look like that.
- The first scenario state is only saved after a write or a time move; opening a scenario and reusing the profile without one gives the default `today` scenario.
