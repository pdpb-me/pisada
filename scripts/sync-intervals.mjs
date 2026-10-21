// Copies watch activities from intervals.icu into Supabase `activities`.
// Suunto → intervals.icu → (this, daily in a GitHub Action) → Pisada.
// The "Sync now" button does the same through the Edge Function sync-intervals;
// both use supabase/functions/_shared/intervals.js for the mapping.
//
// Env (GitHub Actions secrets): INTERVALS_API_KEY, INTERVALS_ATHLETE_ID (0 = the key's owner),
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PISADA_USER_ID.
// Optional: OLDEST=YYYY-MM-DD for a one-off backfill (default: the last DAYS days, default 7).
//
// The repo is public, so are Action logs: print counts only, never dates or health values.
// Re-runs are safe: rows upsert on (user_id, external_id), and only the watch columns are
// written, so anything typed in the app on a synced row (clean, run_step, notes) is kept.
import { fetchActivities, lastDays, toRows } from '../supabase/functions/_shared/intervals.js'

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

const range = lastDays(DAYS)
if (process.env.OLDEST) range.oldest = process.env.OLDEST

// POST rows to a table, updating the row when `onConflict` already exists
async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
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

const list = await fetchActivities({ apiKey: API_KEY, athlete: ATHLETE, ...range })
const rows = toRows(list, USER_ID)
await upsert('activities', rows, 'user_id,external_id')
await upsert(
  'sync_status',
  [{ user_id: USER_ID, source: 'intervals', synced_at: new Date().toISOString(), count: rows.length, via: 'daily' }],
  'user_id,source',
)

const bySport = rows.reduce((m, r) => ((m[r.sport] = (m[r.sport] ?? 0) + 1), m), {})
const summary = Object.entries(bySport).map(([s, n]) => `${n} ${s}`).join(', ') || 'none'
console.log(`Synced ${rows.length} of ${list.length} activities (${process.env.OLDEST ? 'backfill' : `last ${DAYS} days`}): ${summary}`)
