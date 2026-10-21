// Pushes planned runs to intervals.icu as structured workouts, so they reach the watch:
// Pisada → (this, in the sync-intervals GitHub Action) → intervals.icu → Suunto app
// ("Upload planned workouts") → SuuntoPlus Guide on the Vertical.
// Pisada owns the plan; intervals.icu is only the pipe to the watch.
//
// Window: today → today + 10 days (Europe/Madrid). The past is never touched.
// Pushed: kind = 'run' sessions with a planned run_step (set by the coaching chat) that
// aren't logged as skipped. Each is one WORKOUT event with external_id "pisada:<plan_session id>",
// so a run moved in the app keeps its event and only the date changes. Events without that
// prefix are never touched, except with --cleanup.
//
// Flags: --dry-run  prints what would change, writes nothing.
//        --cleanup  also deletes hand-made "Run A"/"Run B" workouts without external_id in the
//                   window (a one-off for the two set up by hand on 21 Oct).
// Env: the same as sync-intervals.mjs.
//
// The repo is public, so are Action logs: a normal run prints counts only.
const env = (name, fallback) => {
  const v = process.env[name] || fallback
  if (v === undefined) throw new Error(`Missing env ${name}`)
  return v
}

const API_KEY = env('INTERVALS_API_KEY')
const ATHLETE = env('INTERVALS_ATHLETE_ID', '0')
const SUPABASE_URL = env('SUPABASE_URL').replace(/\/$/, '')
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const USER_ID = env('PISADA_USER_ID')
const DRY_RUN = process.argv.includes('--dry-run')
const CLEANUP = process.argv.includes('--cleanup')

const WINDOW_DAYS = 10
const PREFIX = 'pisada:'
const SLOT_TIME = { am: '07:00:00', pm: '18:00:00' }

const madridDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
const oldest = madridDay(Date.now())
const newest = new Date(Date.parse(`${oldest}T12:00:00Z`) + WINDOW_DAYS * 86400000).toISOString().slice(0, 10)

async function select(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      // New secret keys (sb_secret_…) go in apikey only; a legacy service_role JWT also needs Bearer
      ...(SERVICE_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${SERVICE_KEY}` }),
    },
  })
  if (!res.ok) throw new Error(`Supabase answered ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

async function intervals(method, path, body) {
  const res = await fetch(`https://intervals.icu/api/v1/athlete/${ATHLETE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`API_KEY:${API_KEY}`)}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`intervals.icu answered ${res.status} to ${method} ${path.split('?')[0]}: ${(await res.text()).slice(0, 300)}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Minutes in intervals.icu workout syntax: whole minutes as "2m" (m = minutes), else seconds: 1.5 → "90s"
const dur = (min) => (Number.isInteger(Number(min)) ? `${Number(min)}m` : `${Math.round(Number(min) * 60)}s`)

// The workout text intervals.icu parses into steps. One target type (HR) for the whole workout:
// mixing HR and pace breaks the display on Suunto. Z1-Z2 on the jog is a ceiling, not a band to
// push into. The empty lines around the repeat block are needed for it to parse; the word before
// the duration ("Jog", "Walk") is the step's label on the watch.
function workoutText(step) {
  const lines = []
  if (Number(step.warmup_min) > 0) lines.push(`- Walk warm-up ${dur(step.warmup_min)} Z1 HR`, '')
  lines.push(`Main set ${step.reps}x`, `- Jog ${dur(step.run_min)} Z1-Z2 HR`)
  if (Number(step.walk_min) > 0) lines.push(`- Walk ${dur(step.walk_min)} Z1 HR`)
  if (Number(step.cooldown_min) > 0) lines.push('', `- Walk cool-down ${dur(step.cooldown_min)} Z1 HR`)
  return lines.join('\n')
}

// What the calendar should hold: one event per planned run with a step
const [sessions, steps] = await Promise.all([
  select(
    `plan_sessions?select=id,date,slot,title,run_step,session_logs(status)&user_id=eq.${USER_ID}` +
      `&kind=eq.run&run_step=not.is.null&date=gte.${oldest}&date=lte.${newest}&order=date`,
  ),
  select(`run_steps?select=step,reps,run_min,walk_min,warmup_min,cooldown_min&user_id=eq.${USER_ID}`),
])
const desired = new Map()
const unknownStep = new Set() // a step missing from run_steps: warn, and leave its event as it is
for (const s of sessions) {
  if (s.session_logs?.status === 'skipped') continue
  const step = steps.find((st) => st.step === s.run_step)
  if (!step) {
    console.warn(`Warning: step ${s.run_step} is not in run_steps, one run not pushed`)
    unknownStep.add(PREFIX + s.id)
    continue
  }
  desired.set(PREFIX + s.id, {
    category: 'WORKOUT',
    type: 'Run',
    start_date_local: `${s.date}T${SLOT_TIME[s.slot] ?? '00:00:00'}`,
    name: `${s.title} — Step ${s.run_step}`,
    description: workoutText(step),
    external_id: PREFIX + s.id,
  })
}

// What the calendar holds now
const events = await intervals('GET', `/events?oldest=${oldest}&newest=${newest}&category=WORKOUT`)
const ours = new Map(events.filter((e) => e.external_id?.startsWith(PREFIX)).map((e) => [e.external_id, e]))

const show = (verb, e) => {
  if (DRY_RUN) console.log(`\n${verb}: ${e.name} · ${e.start_date_local}${e.description ? `\n${e.description}` : ''}`)
}
const counts = { created: 0, updated: 0, deleted: 0, unchanged: 0, cleaned: 0 }

if (CLEANUP) {
  const handMade = events.filter((e) => e.type === 'Run' && !e.external_id && /^Run [AB]\b/.test(e.name ?? ''))
  for (const e of handMade) {
    show('delete hand-made', e)
    if (!DRY_RUN) await intervals('DELETE', `/events/${e.id}`)
    console.log(`Cleanup: deleted hand-made workout "${e.name}"`)
    counts.cleaned++
  }
}

const same = (a, b) =>
  a.start_date_local === b.start_date_local &&
  a.name === b.name &&
  a.type === b.type &&
  (a.description ?? '').trimEnd() === b.description.trimEnd()

for (const [id, want] of desired) {
  const have = ours.get(id)
  if (!have) {
    show('create', want)
    if (!DRY_RUN) await intervals('POST', '/events?upsertOnUid=false', want)
    counts.created++
  } else if (!same(have, want)) {
    show('update', want)
    if (!DRY_RUN) await intervals('PUT', `/events/${have.id}`, want)
    counts.updated++
  } else counts.unchanged++
}

// Moved out of the window, skipped, step set back to null, or deleted in Pisada
for (const [id, have] of ours) {
  if (desired.has(id) || unknownStep.has(id)) continue
  show('delete', have)
  if (!DRY_RUN) await intervals('DELETE', `/events/${have.id}`)
  counts.deleted++
}

const summary = Object.entries(counts).filter(([k, n]) => n > 0 || k !== 'cleaned').map(([k, n]) => `${n} ${k}`).join(', ')
console.log(`${DRY_RUN ? 'Dry run, nothing written. Would have: ' : ''}Planned runs (next ${WINDOW_DAYS} days): ${summary}`)
