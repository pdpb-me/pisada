// Copies watch activities from intervals.icu into Supabase `activities`.
// Suunto → intervals.icu → (this, daily in a GitHub Action) → Pisada.
//
// Env (GitHub Actions secrets): INTERVALS_API_KEY, INTERVALS_ATHLETE_ID (0 = the key's owner),
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PISADA_USER_ID.
// Optional: OLDEST=YYYY-MM-DD for a one-off backfill (default: the last DAYS days, default 7).
//
// The repo is public, so are Action logs: print counts only, never dates or health values.
// Re-runs are safe: rows upsert on (user_id, external_id), and only the watch columns are
// written, so anything typed in the app on a synced row (clean, run_step, notes) is kept.

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
const DAYS = Number(env('DAYS', '7'))

const iso = (d) => d.toISOString().slice(0, 10)
const newest = iso(new Date(Date.now() + 86400000)) // tomorrow, to cover time zones
const oldest = process.env.OLDEST || iso(new Date(Date.now() - DAYS * 86400000))

// intervals.icu activity type → Pisada sport
const SPORT = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run', Treadmill: 'run',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike',
  Walk: 'walk', Hike: 'hike',
  WeightTraining: 'strength', Workout: 'workout', Yoga: 'yoga', Pilates: 'pilates',
  Swim: 'swim', OpenWaterSwim: 'swim',
}
const sportOf = (type) => SPORT[type] ?? String(type ?? 'other').toLowerCase()

const int = (n) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null)
const hr = (n) => {
  const v = int(n)
  return v != null && v >= 20 && v <= 250 ? v : null
}

function toRow(a) {
  return {
    user_id: USER_ID,
    external_id: String(a.id),
    source: 'intervals',
    date: String(a.start_date_local).slice(0, 10),
    sport: sportOf(a.type),
    duration_s: int(a.moving_time ?? a.elapsed_time),
    distance_m: int(a.distance),
    hr_avg: hr(a.average_heartrate),
    elevation_m: int(a.total_elevation_gain),
    load: int(a.icu_training_load),
    raw: a,
  }
}

async function fetchActivities() {
  const url = `https://intervals.icu/api/v1/athlete/${ATHLETE}/activities?oldest=${oldest}&newest=${newest}`
  const auth = Buffer.from(`API_KEY:${API_KEY}`).toString('base64')
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`intervals.icu answered ${res.status} ${res.statusText}`)
  return res.json()
}

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/activities?on_conflict=user_id,external_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        // New secret keys (sb_secret_…) go in apikey only; a legacy service_role JWT also needs Bearer
        ...(SERVICE_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${SERVICE_KEY}` }),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + 200)),
    })
    if (!res.ok) throw new Error(`Supabase answered ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
}

const list = await fetchActivities()
// Skip entries without a usable id or date (e.g. stubs intervals.icu can't read)
const rows = list.filter((a) => a && a.id && a.start_date_local).map(toRow)
await upsert(rows)

const bySport = rows.reduce((m, r) => ((m[r.sport] = (m[r.sport] ?? 0) + 1), m), {})
const summary = Object.entries(bySport).map(([s, n]) => `${n} ${s}`).join(', ') || 'none'
console.log(`Synced ${rows.length} of ${list.length} activities (${process.env.OLDEST ? 'backfill' : `last ${DAYS} days`}): ${summary}`)
