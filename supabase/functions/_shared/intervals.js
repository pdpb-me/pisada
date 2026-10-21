// intervals.icu → Pisada `activities` rows. Plain JS with no Node or Deno APIs, shared by
// the daily GitHub Action (scripts/sync-intervals.mjs) and the "Sync now" Edge Function.
//
// Only the watch columns are written, so anything typed in the app on a synced row
// (clean, run_step, notes) is kept when a row is synced again.

// intervals.icu activity type → Pisada sport
const SPORT = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run', Treadmill: 'run',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike', EMountainBikeRide: 'bike', GravelRide: 'bike',
  MountainBikeRide: 'bike',
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

export const isoDay = (d) => d.toISOString().slice(0, 10)

// The last `days` days up to tomorrow (tomorrow covers time zones)
export function lastDays(days) {
  return {
    oldest: isoDay(new Date(Date.now() - days * 86400000)),
    newest: isoDay(new Date(Date.now() + 86400000)),
  }
}

export async function fetchActivities({ apiKey, athlete = '0', oldest, newest }) {
  const url = `https://intervals.icu/api/v1/athlete/${athlete}/activities?oldest=${oldest}&newest=${newest}`
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${btoa(`API_KEY:${apiKey}`)}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`intervals.icu answered ${res.status} ${res.statusText}`)
  return res.json()
}

// Skips entries without a usable id or date (e.g. stubs intervals.icu can't read)
export function toRows(list, userId) {
  return list
    .filter((a) => a && a.id && a.start_date_local)
    .map((a) => ({
      user_id: userId,
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
    }))
}
