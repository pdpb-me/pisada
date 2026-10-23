// A made-up 12 weeks of Pisada, in the shape of the real tables. Deterministic: the same
// seed always gives the same weeks. Nothing here is real data.
//
// The weeks (Monday dates), with the situations the brief asks for:
//   W1  31 Aug  ordinary week, ladder step 1, first heel-raise test skipped
//   W2   7 Sep  ordinary; Saturday's run has a niggle (step holds)
//   W3  14 Sep  test day with results; 2 clean runs
//   W4  21 Sep  ladder up to step 3; 2-day hut trip at the weekend (routine missed)
//   W5  28 Sep  sick week: almost everything skipped; new block (month 2)
//   W6   5 Oct  missed check-ins and late logging (yesterday fixed today); 2 clean runs
//   W7  12 Oct  step 4; arch flare-up: a run that isn't clean, Moderate–Severe mornings
//   W8  19 Oct  ladder drops to step 3; Pedro moves sessions himself
//   W9  26 Oct  test day; 2 clean runs
//   W10  2 Nov  month change and new block (month 3, step 5, ladder step 6 added);
//               heavy bike commuting, neck and tingling worse; holiday from Saturday
//   W11  9 Nov  holiday without the app: no plan, no logs, only the watch
//   W12 16 Nov  back: step 4, a test on Thursday
import { addDays } from '@/lib/dates'
import type { Tables } from '@/lib/database.types'
import { DEMO_USER, emptyDb, type Db } from '@/demo/db'

export const FIRST_MONDAY = '2026-08-31'
export const WEEKS = 12

// --- small helpers -------------------------------------------------------------

// mulberry32: a tiny seeded random generator
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A local time on a date, as the ISO timestamp the database stores
export function at(date: string, hm: string) {
  return new Date(`${date}T${hm}:00`).toISOString()
}

const hm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(Math.max(0, Math.min(59, m))).padStart(2, '0')}`

// --- the plan the coach writes ------------------------------------------------

type Kind = 'neck' | 'tendon' | 'pilates' | 'run' | 'stability' | 'mobility' | 'test' | 'hike'

const TEMPLATE: Record<Kind, { title: string; instructions: string; exercises: string[]; video_ids: string[] }> = {
  neck: {
    title: 'Neck micro-dose',
    instructions: 'Chin nods 10 × 5 s, T-hold 3 × 15 s, chair extension 1 × 8. Gentle: no pain.',
    exercises: ['chin_nod', 't_hold', 'thoracic_ext_chair'],
    video_ids: [],
  },
  tendon: {
    title: 'Arch strength',
    instructions: 'Heel raises 3 × 12 slow, right side +1 set. Heel-raised holds 4 × 30 s. Mild is OK; stop above Mild.',
    exercises: ['ball_squeeze_heel_raise', 'sl_heel_raise_step', 'sl_heel_hold_towel'],
    video_ids: ['CMD0zoHT1AI'],
  },
  pilates: {
    title: 'Pilates class',
    instructions: 'With your teacher. Tell them about the arch and the neck.',
    exercises: [],
    video_ids: [],
  },
  run: {
    title: 'Run',
    instructions: 'Flat route, easy pace. Stop if the arch goes above Mild.',
    exercises: [],
    video_ids: [],
  },
  stability: {
    title: 'Balance & hips',
    instructions: 'Banded inversion 3 × 15, right side +1 set. Single-leg holds 3 × 30 s.',
    exercises: ['banded_inversion', 'sl_heel_hold_towel'],
    video_ids: ['NFGlJXeJQ-U'],
  },
  mobility: {
    title: 'Neck & shoulder mobility',
    instructions: 'Follow the video. Skip the hands-behind-head press.',
    exercises: [],
    video_ids: ['uscW0kRiY4w'],
  },
  test: {
    title: 'Heel-raise test',
    instructions: 'Single-leg heel raises to fatigue: left first, then right. Count clean reps. Stop if the arch goes above Mild.',
    exercises: ['sl_heel_raise_test'],
    video_ids: [],
  },
  hike: {
    title: 'Hut trip',
    instructions: 'Easy pace on the climbs, poles on the way down. No running.',
    exercises: [],
    video_ids: [],
  },
}

// pm session per weekday (Mon = 0); the neck micro-dose is every morning
const WEEKLY: (Kind | null)[] = ['tendon', 'pilates', 'run', 'stability', 'pilates', 'run', 'mobility']
const SLOT: Partial<Record<Kind, 'am' | 'pm'>> = { mobility: 'am', run: 'pm' }

// Ladder step the coach plans for each week's runs (null: no runs that week)
const STEP_BY_WEEK = [1, 2, 2, 3, 3, 3, 4, 3, 4, 5, null, 4]
const BLOCK_BY_WEEK = (w: number) => (w < 4 ? '2026-09 month1' : w < 9 ? '2026-10 month2' : '2026-11 month3')

export const RUN_STEPS: Omit<Tables<'run_steps'>, 'id' | 'created_at' | 'user_id'>[] = [
  {
    step: 1,
    label: '6 × (2′ jog / 2′ walk)',
    reps: 6,
    run_min: 2,
    walk_min: 2,
    total_run_min: 12,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-09 month1',
  },
  {
    step: 2,
    label: '5 × (3′ jog / 2′ walk)',
    reps: 5,
    run_min: 3,
    walk_min: 2,
    total_run_min: 15,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-09 month1',
  },
  {
    step: 3,
    label: '4 × (5′ jog / 2′ walk)',
    reps: 4,
    run_min: 5,
    walk_min: 2,
    total_run_min: 20,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-09 month1',
  },
  {
    step: 4,
    label: '3 × (7′ jog / 1.5′ walk)',
    reps: 3,
    run_min: 7,
    walk_min: 1.5,
    total_run_min: 21,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-09 month1',
  },
  {
    step: 5,
    label: '3 × (8′ jog / 1′ walk)',
    reps: 3,
    run_min: 8,
    walk_min: 1,
    total_run_min: 24,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-09 month1',
  },
  {
    step: 6,
    label: '2 × (12′ jog / 2′ walk)',
    reps: 2,
    run_min: 12,
    walk_min: 2,
    total_run_min: 24,
    warmup_min: 5,
    cooldown_min: 3,
    block: '2026-11 month3',
  },
]

// Public YouTube videos (titles as on YouTube); the notes and flags are the coach's
const VIDEOS: Omit<Tables<'videos'>, 'user_id' | 'created_at'>[] = [
  {
    yt_id: 'CMD0zoHT1AI',
    title: 'Stop Over-Pronation',
    duration_s: 660,
    flags: null,
    notes: 'Toe yoga, single-leg big-toe drive, heel-raised holds, wall drive.',
    available: true,
    playlists: [],
    tags: ['foot', 'ankle', 'strength'],
    published_at: null,
    synced_at: null,
    views: null,
  },
  {
    yt_id: 'NFGlJXeJQ-U',
    title: 'Targeted Tibialis Strength',
    duration_s: 540,
    flags: 'Not a tibialis posterior video: use the last drill only',
    notes: 'Trains tibialis anterior. The outer → inner foot roll under load is useful.',
    available: true,
    playlists: [],
    tags: ['ankle', 'strength'],
    published_at: null,
    synced_at: null,
    views: null,
  },
  {
    yt_id: 'uscW0kRiY4w',
    title: 'Release Tension: Neck & Shoulder',
    duration_s: 720,
    flags: 'Neck: skip the hand pressure on the head; don’t look up at the end of the rotation',
    notes: 'T-position, cactus and thread-the-needle are good.',
    available: true,
    playlists: [],
    tags: ['neck', 'shoulder', 'mobility'],
    published_at: null,
    synced_at: null,
    views: null,
  },
]

// What the coach wrote at each weekly check-in (week_start = the Monday it plans)
const REVIEWS: Record<number, { summary: string; decisions: string }> = {
  1: {
    summary:
      'First week: 11 of 14 sessions done. Arch mornings Mild on 4 days, None on 2. Both runs clean. Neck mostly None, Mild after the longer rides. The heel-raise test was skipped: no problem.',
    decisions: 'Up to step 2: two clean runs in a row. Same plan otherwise. Heel-raise test moved to Thursday next week.',
  },
  2: {
    summary:
      'Good week. Wednesday’s run clean; Saturday’s run had a small niggle (Mild) that was still there on Sunday morning. Neck calm. Micro-dose done or partly on 5 days.',
    decisions: 'Hold step 2: the niggle lingered. Test on Thursday instead of Balance & hips.',
  },
  3: {
    summary:
      'Test: left 21, right 12 reps. The right side is clearly weaker, as expected. Two clean runs at step 2. Arch mornings Mild or None all week.',
    decisions:
      'Up to step 3. Right side keeps +1 set. Hut trip at the weekend: two hike days instead of Saturday’s run and Sunday’s mobility. Walk the descents slowly.',
  },
  4: {
    summary:
      'Wednesday’s run at step 3 was clean. The hut trip went well: arch Mild on Sunday morning, no worse. The micro-dose was missed on both trip days: expected.',
    decisions: 'Stay on step 3. New block (month 2) from Monday: same structure.',
  },
  5: {
    summary: 'Sick week: almost everything skipped, which was right. Arch None or Mild from rest. Neck calm without the bike.',
    decisions: 'Restart gently: stay on step 3, first run on Wednesday only if you feel well. No test this week.',
  },
  6: {
    summary:
      'Back after being sick: 2 clean runs at step 3. Some check-ins missed early in the week and logged a day late, which is fine. Arch mornings mostly Mild.',
    decisions: 'Up to step 4. Keep the neck micro-dose short: 3 minutes is enough on busy mornings.',
  },
  7: {
    summary:
      'Arch flare-up: Wednesday’s run at step 4 was not clean (Moderate during), then Moderate and Severe mornings on Thursday and Friday. Saturday’s run was skipped: good call.',
    decisions: 'Down to step 3. Tendon work stays, slower and with less range. Move sessions yourself if the arch needs an extra rest day.',
  },
  8: {
    summary:
      'Flare settled: arch Mild from Tuesday, None on Saturday. Two clean runs at step 3 (one moved to Thursday). Pilates moved with the teacher.',
    decisions: 'Back up to step 4. Heel-raise test on Monday.',
  },
  9: {
    summary:
      'Test: left 23, right 17 reps. Right side up from 12 in September. Two clean runs at step 4. Neck Mild on 3 evenings, all after long rides.',
    decisions:
      'New block (month 3) from Monday. Step 5 for Wednesday’s run. Step 6 is now in the ladder. Holiday from Saturday 7 November: no plan until you are back.',
  },
  10: {
    summary:
      'A heavy bike week (rain detours, 35–45 min rides): neck Moderate on 3 evenings and the hands tingled on 4. The run at step 5 was clean.',
    decisions: 'Enjoy the holiday: no plan this week. Walk and hike as you like. We restart on Monday 16.',
  },
  11: {
    summary: 'Welcome back. 9 days without the app: hikes and walks on the watch, no check-ins. That’s fine.',
    decisions:
      'Restart at step 4, not 5, after the break. Heel-raise test on Thursday. Try the shorter bike route on two days to see if the neck likes it.',
  },
}

// --- one simulated life -------------------------------------------------------

type Ctx = { r: () => number; db: Db; week: number; dow: number; date: string }

const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
const between = (r: () => number, lo: number, hi: number) => Math.round(lo + r() * (hi - lo))

const COMMENTS: Partial<Record<Kind, string[]>> = {
  neck: ['Only the chin nods, short on time', 'Did it at the desk', 'Neck stiff after the bike, eased with the nods'],
  tendon: ['Arch tight on the last set, eased after', 'Right side shaky on the last reps', 'Felt strong today'],
  pilates: ['Teacher added side planks', 'Easy class', 'Neck felt better after'],
  run: ['Calves tight, arch fine', 'Windy, kept it easy', 'Felt good, could have done more'],
  stability: ['Balance better on the right', 'Band slipped, used the heavy one'],
  mobility: ['Skipped the head press, as planned'],
}

export function buildWorld(seed = 7): Db {
  const r = rng(seed)
  const db = emptyDb()
  const id = (() => {
    let n = 0
    return (prefix: string) => `${prefix}-${String(++n).padStart(5, '0')}`
  })()

  const startStamp = at(addDays(FIRST_MONDAY, -2), '10:00')
  for (const s of RUN_STEPS)
    db.run_steps.push({
      ...s,
      id: id('step'),
      // step 6 arrives with the new block (month 3)
      created_at: s.step === 6 ? at('2026-11-01', '18:00') : startStamp,
      user_id: DEMO_USER,
    })
  for (const v of VIDEOS) db.videos.push({ ...v, created_at: startStamp, user_id: DEMO_USER })

  // Situations by date
  const W = (w: number, dow: number) => addDays(FIRST_MONDAY, (w - 1) * 7 + dow)
  const sick = (d: string) => d >= W(5, 0) && d <= W(5, 4)
  const trip = (d: string) => d === W(4, 5) || d === W(4, 6)
  const holiday = (d: string) => d >= W(10, 5) && d <= W(11, 6)
  const heavyBike = (d: string) => d >= W(10, 0) && d <= W(10, 4)
  const flare = (d: string) => d >= W(7, 3) && d <= W(8, 0)
  const lateWeek = (d: string) => d >= W(6, 0) && d <= W(6, 2)

  // Tests replace one pm session
  const TESTS: Record<string, { L: number; R: number } | 'skip' | 'pending'> = {
    [W(1, 5)]: 'skip', // Saturday of week 1: the first test, skipped
    [W(3, 3)]: { L: 21, R: 12 },
    [W(9, 0)]: { L: 23, R: 17 },
    [W(12, 3)]: 'pending', // Thursday of week 12 (the demo's "today")
  }

  // Clean or not, per run (by date). Missing: decided by chance (mostly clean)
  const RUN_OUTCOME: Record<string, { status: 'done' | 'partial' | 'skipped'; clean: boolean | null; pain: number }> = {
    [W(2, 5)]: { status: 'done', clean: false, pain: 2 },
    [W(5, 2)]: { status: 'skipped', clean: null, pain: 0 },
    [W(5, 5)]: { status: 'skipped', clean: null, pain: 0 },
    [W(7, 2)]: { status: 'partial', clean: false, pain: 5 },
    [W(7, 5)]: { status: 'skipped', clean: null, pain: 0 },
    [W(10, 2)]: { status: 'done', clean: null, pain: 0 }, // clean never answered (the demo opens the next morning)
    [W(12, 2)]: { status: 'done', clean: null, pain: 2 }, // clean not decided yet: asked next morning
  }

  // Sessions Pedro moved himself (week 8): planned day → new day and slot
  const MOVES: Record<string, { to: string; slot: 'am' | 'pm' }> = {
    [`${W(8, 2)}|run`]: { to: W(8, 3), slot: 'pm' }, // Run A: Wednesday → Thursday
    [`${W(8, 3)}|stability`]: { to: W(8, 2), slot: 'pm' }, // Balance & hips: Thursday → Wednesday
    [`${W(8, 4)}|pilates`]: { to: W(8, 5), slot: 'pm' }, // Friday's class moved to Saturday by the teacher
  }

  // 1. The plan, week by week, written on the Sunday before at 18:00
  for (let w = 1; w <= WEEKS; w++) {
    const monday = W(w, 0)
    const written = at(addDays(monday, -1), '18:00')
    const step = STEP_BY_WEEK[w - 1]
    let runN = 0
    for (let dow = 0; dow < 7; dow++) {
      const date = addDays(monday, dow)
      if (holiday(date)) continue
      const add = (kind: Kind, slot: 'am' | 'pm', extra: Partial<Tables<'plan_sessions'>> = {}) => {
        const t = TEMPLATE[kind]
        const move = MOVES[`${date}|${kind}`]
        db.plan_sessions.push({
          id: id('plan'),
          date: move?.to ?? date,
          slot: move?.slot ?? slot,
          kind,
          title: t.title,
          instructions: t.instructions,
          exercises: [...t.exercises],
          video_ids: [...t.video_ids],
          run_step: null,
          block: BLOCK_BY_WEEK(w - 1),
          created_at: written,
          user_id: DEMO_USER,
          ...extra,
        })
      }
      add('neck', 'am')
      let kind = WEEKLY[dow]
      if (TESTS[date]) kind = 'test'
      if (trip(date)) kind = 'hike'
      if (!kind) continue
      if (kind === 'run') {
        runN++
        add('run', 'pm', { title: runN === 1 ? 'Run A' : 'Run B', run_step: step })
      } else if (kind === 'hike') add('hike', 'am', { title: dow === 5 ? 'Hut trip, day 1' : 'Hut trip, day 2' })
      else add(kind, SLOT[kind] ?? 'pm')
    }
  }

  // 2. Reviews (from week 2: the first check-in plans week 2)
  for (const [w, text] of Object.entries(REVIEWS)) {
    const monday = W(Number(w) + 1, 0)
    db.reviews.push({
      id: id('review'),
      week_start: monday,
      summary: text.summary,
      decisions: text.decisions,
      created_at: at(addDays(monday, -1), '18:00'),
      user_id: DEMO_USER,
    })
  }

  // 3. Each day: what Pedro did, logged, felt; what the watch recorded
  let archBase = 2 // Mild, slowly better
  const lastDay = W(WEEKS, 6)
  for (let date = FIRST_MONDAY; date <= lastDay; date = addDays(date, 1)) {
    const week = Math.floor((Date.parse(`${date}T12:00:00`) - Date.parse(`${FIRST_MONDAY}T12:00:00`)) / (7 * 86400000)) + 1
    const dow = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
    const ctx: Ctx = { r, db, week, dow, date }
    const workday = dow < 5 && !sick(date) && !holiday(date)
    if (week >= 9) archBase = 0

    // Watch: bike commutes
    let bikeMin = 0
    if (workday && r() < 0.88) {
      const heavy = heavyBike(date)
      for (const [h, m] of [
        [8, 5],
        [18, 10],
      ]) {
        if (!heavy && r() < 0.12) continue // took the train one way
        const s = heavy ? between(r, 2000, 2700) : between(r, 1050, 1450)
        bikeMin += s / 60
        watch(ctx, id, 'bike', s, {
          distance_m: heavy ? between(r, 10500, 13500) : between(r, 6100, 6900),
          hr_avg: between(r, 112, 129),
          load: heavy ? between(r, 20, 28) : between(r, 9, 14),
          at: hm(h, m),
        })
      }
    }
    const longPcDay = workday && r() < 0.3

    // Watch: walks, and the holiday's hikes
    if (holiday(date)) {
      if (r() < 0.6)
        watch(ctx, id, 'hike', between(r, 10800, 19800), {
          distance_m: between(r, 9000, 17000),
          hr_avg: between(r, 108, 124),
          load: between(r, 70, 140),
          elevation_m: between(r, 500, 1200),
          at: '09:30',
        })
      else
        watch(ctx, id, 'walk', between(r, 2400, 5400), {
          distance_m: between(r, 3000, 6500),
          hr_avg: between(r, 90, 104),
          load: between(r, 6, 14),
          at: '11:00',
        })
    } else if (!sick(date) && r() < 0.22) {
      watch(ctx, id, 'walk', between(r, 1800, 3200), {
        distance_m: between(r, 2200, 4000),
        hr_avg: between(r, 88, 102),
        load: between(r, 4, 9),
        at: '13:10',
      })
    } else if (sick(date) && dow === 6) {
      watch(ctx, id, 'walk', 1250, { distance_m: 1400, hr_avg: 92, load: 2, at: '16:00' })
    }

    // The day's sessions
    let ranToday = false
    const today = db.plan_sessions.filter((p) => p.date === date)
    for (const p of today) {
      let status: 'done' | 'partial' | 'skipped' | null
      let pain: number | null = null
      if (sick(date)) status = r() < 0.85 ? 'skipped' : r() < 0.5 ? 'partial' : null
      else if (p.kind === 'neck') {
        const x = r()
        status = trip(date) ? null : x < 0.45 ? 'done' : x < 0.7 ? 'partial' : x < 0.9 ? 'skipped' : null
      } else if (p.kind === 'run') {
        const o = RUN_OUTCOME[date]
        status = o ? o.status : r() < 0.92 ? 'done' : 'partial'
        pain = o ? o.pain : r() < 0.7 ? 0 : 2
      } else if (p.kind === 'test') {
        const t = TESTS[date]
        status = t === 'skip' ? 'skipped' : t === 'pending' ? null : 'done'
        pain = 2
      } else {
        const x = r()
        status = flare(date) && p.kind === 'tendon' ? 'partial' : x < 0.78 ? 'done' : x < 0.86 ? 'partial' : x < 0.95 ? 'skipped' : null
        if (['tendon', 'stability', 'hike'].includes(p.kind)) pain = flare(date) ? 5 : r() < 0.6 ? 0 : 2
      }
      if (week === WEEKS && dow >= 3) status = null // the demo's "today" and after: not done yet
      if (!status) continue

      // When it was logged: right after, or (late-logging days, the trip) the next morning
      const late = (lateWeek(date) && p.slot === 'pm' && dow === 1) || p.kind === 'hike'
      const loggedAt = late
        ? at(addDays(date, 1), hm(7, between(r, 45, 59)))
        : p.slot === 'am'
          ? at(date, hm(7, between(r, 35, 58)))
          : at(date, hm(19, between(r, 5, 59)))
      const comment =
        status !== 'skipped' && r() < 0.18
          ? pick(r, COMMENTS[p.kind as Kind] ?? ['']) || null
          : sick(date) && status === 'skipped' && r() < 0.4
            ? 'Flu, stayed in bed'
            : null
      const logId = id('log')
      db.session_logs.push({ id: logId, plan_session_id: p.id, status, comment, logged_at: loggedAt, user_id: DEMO_USER })

      const asksArch = ['tendon', 'run', 'stability', 'test', 'hike'].includes(p.kind)
      if (asksArch && status !== 'skipped' && pain != null && r() < 0.85)
        db.symptoms.push({
          id: id('sym'),
          session_log_id: logId,
          date,
          body_area: 'arch',
          side: 'R',
          timing: 'during',
          score: pain,
          context: null,
          created_at: loggedAt,
          user_id: DEMO_USER,
        })

      if (p.kind === 'test' && status === 'done') {
        const t = TESTS[date] as { L: number; R: number }
        for (const side of ['L', 'R'] as const)
          db.tests.push({
            id: id('test'),
            plan_session_id: p.id,
            date,
            test: 'sl_heel_raise',
            side,
            value: t[side],
            unit: 'reps',
            notes: null,
            created_at: loggedAt,
            user_id: DEMO_USER,
          })
      }

      if (p.kind === 'run' && status !== 'skipped') {
        ranToday = true
        const o = RUN_OUTCOME[date]
        const stepN = p.run_step ?? 1
        db.activities.push(
          activity(id('run'), date, 'run', 'manual', loggedAt, {
            plan_session_id: p.id,
            run_step: stepN,
            clean: o ? o.clean : true,
          }),
        )
        // the watch copy, except once (watch left at home: week 2, Wednesday)
        if (date !== W(2, 2)) {
          const st = RUN_STEPS.find((s) => s.step === stepN)!
          const minutes = st.warmup_min + st.reps * (st.run_min + st.walk_min) + st.cooldown_min
          const share = status === 'partial' ? 0.6 : 1
          watch(ctx, id, 'run', Math.round(minutes * 60 * share + between(r, -40, 80)), {
            distance_m: Math.round((st.total_run_min * 165 + (minutes - st.total_run_min) * 95) * share),
            hr_avg: between(r, 136, 151),
            load: Math.round(st.total_run_min * 1.7 * share + between(r, 0, 6)),
            at: '18:15',
          })
        }
      }
      if ((p.kind === 'tendon' || p.kind === 'stability') && status === 'done' && r() < 0.55)
        watch(ctx, id, 'strength', between(r, 2100, 2650), { hr_avg: between(r, 96, 112), load: between(r, 14, 24), at: '18:20' })
      if (p.kind === 'pilates' && status === 'done' && r() < 0.4)
        watch(ctx, id, 'pilates', between(r, 3000, 3400), { hr_avg: between(r, 84, 96), load: between(r, 8, 13), at: '18:30' })
      if (p.kind === 'hike')
        watch(ctx, id, 'hike', dow === 5 ? 18400 : 14900, {
          distance_m: dow === 5 ? 14200 : 11800,
          hr_avg: dow === 5 ? 121 : 116,
          load: dow === 5 ? 142 : 108,
          elevation_m: dow === 5 ? 1040 : 760,
          at: '08:40',
        })
    }

    // Morning check-in: right arch, first steps
    const yesterdayRun = db.activities.find((a) => a.date === addDays(date, -1) && a.source === 'manual' && a.sport === 'run')
    let arch = archBase
    if (yesterdayRun && r() < 0.35) arch = Math.max(arch, 2)
    if (date === W(2, 6)) arch = 2 // the niggle lingered
    if (date === W(7, 3) || date === W(7, 5)) arch = 5
    if (date === W(7, 4)) arch = 8
    if (date === W(7, 6) || date === W(8, 0) || date === W(8, 1)) arch = 2
    if (sick(date)) arch = r() < 0.5 ? 0 : 2
    if (week === 1 && r() < 0.5) arch = 2
    const missMorning = holiday(date) || lateWeek(date) || (sick(date) && r() < 0.4) || date === W(4, 6) || r() < 0.1
    const isDemoToday = week === WEEKS && dow >= 3
    if (!missMorning && !isDemoToday)
      db.symptoms.push(checkIn(id('sym'), date, 'arch', 'next_morning', arch, at(date, hm(7, between(r, 2, 30)))))

    // Weight, a few mornings a week
    if (!missMorning && !isDemoToday && r() < 0.35) {
      const kg = 73.6 - week * 0.09 + (r() - 0.5) * 0.8 + (sick(date) ? -0.6 : 0)
      db.weights.push({ id: id('kg'), date, kg: Math.round(kg * 10) / 10, created_at: at(date, '07:10'), user_id: DEMO_USER })
    }

    // Evening check-in: neck and hand tingling over the whole day
    let neck = 0
    if (bikeMin >= 60) neck = 5
    else if (bikeMin >= 35) neck = r() < 0.6 ? 2 : 0
    if (longPcDay) neck = Math.min(8, neck === 0 ? 2 : neck + 3)
    if (ranToday && r() < 0.4) neck = Math.max(neck, 2)
    if (heavyBike(date) && r() < 0.3) neck = 8
    if (sick(date)) neck = 0
    const hands = neck >= 5 ? (r() < 0.6 ? 5 : 2) : neck >= 2 ? (r() < 0.4 ? 2 : 0) : r() < 0.06 ? 2 : 0
    const missEvening =
      holiday(date) || trip(date) || (lateWeek(date) && dow < 2) || (sick(date) && r() < 0.6) || r() < 0.18 || (week === WEEKS && dow >= 3)
    if (!missEvening) {
      const when = at(date, hm(21, between(r, 10, 55)))
      db.symptoms.push(checkIn(id('sym'), date, 'neck', 'evening', neck, when))
      db.symptoms.push(checkIn(id('sym'), date, 'hands', 'evening', hands, when))
    }
  }

  return db
}

function checkIn(id: string, date: string, body_area: string, timing: string, score: number, created_at: string): Tables<'symptoms'> {
  return {
    id,
    date,
    body_area,
    side: body_area === 'arch' ? 'R' : 'C',
    timing,
    score,
    context: timing === 'next_morning' ? 'morning check-in' : body_area === 'hands' ? 'tingling' : 'evening check-in',
    session_log_id: null,
    created_at,
    user_id: DEMO_USER,
  }
}

function activity(
  id: string,
  date: string,
  sport: string,
  source: string,
  created_at: string,
  extra: Partial<Tables<'activities'>>,
): Tables<'activities'> {
  return {
    id,
    date,
    sport,
    source,
    created_at,
    clean: null,
    distance_m: null,
    duration_s: null,
    elevation_m: null,
    external_id: null,
    hr_avg: null,
    load: null,
    notes: null,
    plan_session_id: null,
    raw: null,
    run_step: null,
    user_id: DEMO_USER,
    ...extra,
  }
}

// A watch activity, as the intervals.icu sync writes it: it arrives at the next sync
// (07:00 or 20:00)
function watch(
  ctx: Ctx,
  id: (p: string) => string,
  sport: string,
  duration_s: number,
  o: { distance_m?: number; hr_avg?: number; load?: number; elevation_m?: number; at: string },
) {
  const synced = o.at < '20:00' ? at(ctx.date, '20:00') : at(addDays(ctx.date, 1), '07:00')
  const rowId = id('watch')
  ctx.db.activities.push(
    activity(rowId, ctx.date, sport, 'intervals', synced, {
      external_id: `i${rowId.slice(-5)}`,
      duration_s,
      distance_m: o.distance_m ?? null,
      hr_avg: o.hr_avg ?? null,
      load: o.load ?? null,
      elevation_m: o.elevation_m ?? null,
    }),
  )
}

// What existed at a moment: every row written by then. sync_status is the last sync
// (07:00 or 20:00) before that moment.
export function snapshot(world: Db, moment: Date): Db {
  const t = moment.toISOString()
  const db = emptyDb()
  db.plan_sessions = world.plan_sessions.filter((x) => x.created_at <= t)
  db.session_logs = world.session_logs.filter((x) => x.logged_at <= t)
  db.symptoms = world.symptoms.filter((x) => x.created_at <= t)
  db.activities = world.activities.filter((x) => x.created_at <= t)
  db.tests = world.tests.filter((x) => x.created_at <= t)
  db.weights = world.weights.filter((x) => x.created_at <= t)
  db.run_steps = world.run_steps.filter((x) => x.created_at <= t)
  db.reviews = world.reviews.filter((x) => x.created_at <= t)
  db.videos = world.videos.filter((x) => x.created_at <= t)
  if (db.activities.some((a) => a.source === 'intervals'))
    db.sync_status = [{ source: 'intervals', synced_at: lastSync(moment), via: 'daily', count: 4, user_id: DEMO_USER }]
  return structuredClone(db)
}

function lastSync(moment: Date) {
  const d = new Date(moment)
  const h = d.getHours()
  if (h >= 20) d.setHours(20, 0, 0, 0)
  else if (h >= 7) d.setHours(7, 0, 0, 0)
  else {
    d.setDate(d.getDate() - 1)
    d.setHours(20, 0, 0, 0)
  }
  return d.toISOString()
}
