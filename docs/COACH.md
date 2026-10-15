# Pisada: guide for the coaching chat

You (Claude, in the claude.ai project "Pisada do Pedro") read and write Pedro's training data through the **Supabase connector**. The Pisada app on Pedro's phone shows exactly what is in these tables, so follow the conventions below. Otherwise the app won't display a row, or will display it wrongly.

- **Supabase project:** `pisada` (project ref `swubnxbzjqjeuiwlauwi`)
- **Pedro's user id:** `8cbe648a-0d47-40f1-9a38-5cb26f37fd24`
- **Time zone:** Europe (CET/CEST). All `date` columns are Pedro's local calendar date, `YYYY-MM-DD`.

## Golden rules

1. **Every insert sets `user_id = '8cbe648a-0d47-40f1-9a38-5cb26f37fd24'`.** The app fills it in automatically, but through the connector you must set it yourself, or the insert fails.
2. **Never change the ladder step on Pedro's behalf** unless that's decided in the weekly check-in. The app never auto-advances either.
3. **Before deleting anything other than `block = 'sample'` rows,** show Pedro what will be deleted and ask.
4. **Don't change the table structure** (no `create`, `alter` or `drop`). Schema changes are made in Claude Code, in the repo, so the app and the database stay in step.
5. Pedro is the only user. Row Level Security protects the data from the app side; the connector bypasses it, so be careful.

## Tables

### `plan_sessions`: what's planned

| column | notes |
|---|---|
| `date` | local date |
| `slot` | `'am'` or `'pm'` (the app shows AM first) |
| `kind` | free text, but these values drive the app: **`tendon`, `run`, `stability`, `test`** ask "Right arch, during" pain (`neck` sessions ask nothing during: neck pain is asked in the evening check-in); **`run`** also gets the run log (ladder step + clean). Other kinds (`mobility`, `pilates`, `test`, …) show with no pain question. |
| `title` | short, e.g. `Arch strength` |
| `instructions` | one or two sentences shown on the card |
| `video_ids` | array of YouTube ids, e.g. `'{CMD0zoHT1AI}'`. A link only shows if that id exists in `videos`. |
| `exercises` | array of exercise slugs, in display order, e.g. `'{chin_nod,t_hold,thoracic_ext_chair}'`. Each shows a line-drawing figure on the card; tapping it opens the figure large with cues and setup. Valid slugs: `chin_nod`, `t_hold`, `thoracic_ext_chair`, `ball_squeeze_heel_raise`, `sl_heel_raise_step`, `banded_inversion`, `sl_heel_hold_towel`, `sl_heel_raise_test`. **An unknown slug shows nothing**, and adding a new exercise needs a code change (the catalog lives in the app's code, not the database). Defaults to `'{}'`. Keep `instructions` filled too: the large view shows them under **"Today's plan"** (above the cues), so write what to do today (sets, reps, holds). If empty, the catalog's default dose shows instead. |
| `date`, `slot` (moved) | **Pedro can move a session himself** in the app ("Move to another day" in its log). Its date/slot change in place; pain, run log and test results move with it. So a session on a different day than planned is a deliberate move, not an error. |
| `block` | which plan it belongs to, e.g. `'2026-10 month2'`. Makes a block easy to find, replace or delete. |

Example: one day of Month 2.

```sql
insert into plan_sessions (date, slot, kind, title, instructions, video_ids, block, user_id) values
 ('2026-10-19', 'am', 'tendon', 'Arch strength', 'Heel-raised holds 5 × 45 s, then toe yoga 2 × 10. Pain ≤ 3/10 is OK.', '{CMD0zoHT1AI}', '2026-10 month2', '8cbe648a-0d47-40f1-9a38-5cb26f37fd24'),
 ('2026-10-19', 'pm', 'run',    'Run–walk ladder', 'Current ladder step. Stop if arch pain goes above 3/10.', '{}', '2026-10 month2', '8cbe648a-0d47-40f1-9a38-5cb26f37fd24');
```

### `session_logs`: what happened (written by the app)

One row per planned session at most: `plan_session_id` (unique), `status` (`done` | `partial` | `skipped`), `comment`, `logged_at`.

### `symptoms`: pain

| column | notes |
|---|---|
| `body_area` | `arch`, `neck`, `hands`, … (the arch is the **right** foot; `hands` = hand tingling) |
| `side` | `L`, `R`, `C` (centre, for the neck) |
| `score` | 0–10. **The app asks 5 words and stores: None = 0, Mild = 2, Moderate = 5, Severe = 8, Unbearable = 10.** So ≤ 3 = acceptable, 4–6 = hold / back off, 7+ = stop. If you write a score yourself, any 0–10 value is shown in its band. |
| `timing` | `during` (tied to a session log via `session_log_id`), `next_morning` (the morning check-in: arch, first steps out of bed), `evening` (the evening check-in: how the **whole day** was), `general`. Check-ins have `session_log_id` empty and hold one answer per day, area and timing. |

### `activities`: runs and other sport

| column | notes |
|---|---|
| `sport` | `run`, `bike`, `hike`, … |
| `run_step` | ladder step number (see `run_steps`) |
| `clean` | `true` / `false` / empty (= not decided yet). Pedro can set it on the run card or in the next morning's check-in. |
| `plan_session_id` | the planned run it belongs to (unique). The app creates this row when a run session is marked done/partial. |
| `source` | `manual` (app), `intervals` (synced watch data, see below) or `suunto_screenshot` (old way, no longer needed) |
| `duration_s`, `distance_m`, `hr_avg`, `elevation_m`, `load` | watch data: filled by the sync on `intervals` rows |
| `external_id`, `raw` | sync only: the intervals.icu activity id, and the full activity as intervals.icu sent it |

**Watch data arrives by itself (from 15 Oct).** Suunto → intervals.icu → a daily GitHub Action (07:00 Spain) → `activities` rows with `source = 'intervals'`: every sport (runs, bike commutes, weight training…), with time, distance, average HR, elevation and intervals.icu training `load` (HR-based). Don't ask for Suunto screenshots any more, and **don't write or edit `intervals` rows**: the next sync overwrites the watch columns.

**Two rows for one run.** A logged run has its app row (`source = 'manual'`, with `plan_session_id`, `run_step`, `clean`) and, separately, its watch row (`source = 'intervals'`). They aren't linked yet; match them by `date` and `sport = 'run'`. Read the step and clean from the app row, and HR/distance/time/load from the watch row.

### `run_steps`: the run-walk ladder

`step`, `label` (shown as "Step N — label"), `reps`, `run_min`, `walk_min`, `total_run_min`, `warmup_min` (default 5), `cooldown_min` (default 3), `block`. One row per step number. To add step 6:

```sql
insert into run_steps (step, label, reps, run_min, walk_min, total_run_min, block, user_id)
values (6, '2 × (10′ jog / 2′ walk)', 2, 10, 2, 20, '2026-11 month3', '8cbe648a-0d47-40f1-9a38-5cb26f37fd24');
```

Progression rules (display only): clean = no arch niggle, or ≤ 3/10 during that's back to baseline next morning. Up a step only after 2 consecutive clean runs. A niggle ≤ 3 that lingers holds the step; > 3/10 drops one step.

### `videos`, `tests`, `reviews`

- **`videos`:** `yt_id`, `title`, `duration_s`, `notes` (what's in it), `flags` (safety notes; the app shows them under the link). Add a video here before using its id in a plan.
- **`tests`:** `date`, `test` (e.g. `sl_heel_raise`), `side`, `value`, `unit`. **The app writes these itself:** a session whose `exercises` include `sl_heel_raise_test` shows Left / Right number boxes in its log and saves one row per side with `test = 'sl_heel_raise'`, `unit = 'reps'` and `plan_session_id` set (one value per session + test + side; a correction overwrites). Read results with `select date, side, value from tests where test = 'sl_heel_raise' order by date, side;`. Rows you write by hand can leave `plan_session_id` null.
- **`reviews`:** one per week (`week_start` = Monday): `summary` and `decisions`, written by you at the weekly check-in.

## Useful queries

**The week at a glance** (change the dates):

```sql
select p.date, p.slot, p.kind, p.title, l.status, l.comment,
       s.score as pain_during, a.run_step, a.clean
from plan_sessions p
left join session_logs l on l.plan_session_id = p.id
left join symptoms s on s.session_log_id = l.id and s.timing = 'during'
left join activities a on a.plan_session_id = p.id
where p.date between '2026-10-19' and '2026-10-25'
order by p.date, p.slot;
```

**The two daily check-ins (from 15 Oct).**
- **Morning** (opens by itself when yesterday had a run or tendon session): right arch, first steps out of bed → `body_area = 'arch', timing = 'next_morning'`. Also asks whether yesterday's run was clean.
- **Evening** ("How was today?", opens by itself once after 19:00; can be filled for past days): over the **whole day** (work, bike, runs, PC), not just the exercises:
  - right arch → `arch`, `evening` (0/2/5/8/10 words);
  - neck → `neck`, `evening` (same words). **Neck pain comes from the day, not the exercise routine:** Pedro notices it after cycling, after runs and after long PC time. Compare it with the day's synced activities (`activities` with `source = 'intervals'`, e.g. bike commutes) to find triggers;
  - **hand tingling** → `hands`, `evening`, `context = 'tingling'`, stored as None = 0, A bit = 2, A lot = 5. It's a real status linked to the neck: watch it alongside neck pain.
- The app's Progress screen compares the last 7 days with the 7 before (average, needs ≥ 3 answers per week; ±1 point = a real change) for: arch mornings, arch evenings, neck evenings and hand tingling.

**Evening check-ins, last 2 weeks:**

```sql
select date, body_area, score from symptoms
where timing = 'evening'
order by date desc, body_area limit 42;
```

**Morning arch check-ins:**

```sql
select date, score from symptoms
where body_area = 'arch' and timing = 'next_morning'
order by date desc limit 14;
```

## The sample week (remove before loading the real plan)

While the app was being built, a made-up week (12–18 Oct 2026) was loaded with `block = 'sample'`, plus a few sample logs. To remove it:

```sql
delete from activities where notes = 'Sample';
delete from plan_sessions where block = 'sample';  -- also removes their logs and pain scores
```

Pedro's own test taps on 14 Oct were made on sample sessions, so they go too. The morning check-in answer of 14 Oct (`timing = 'next_morning'`) is kept, because it's not tied to a session.
