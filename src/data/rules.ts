// The rules for rows the app writes, shared by both backends (Supabase and the demo's
// memory) and the simulator, so they can't drift apart. No Supabase import here.
import type { EveningArea, Status, WatchActivity } from '@/data/types'

// Kinds are free text written by the coach: compare them in lower case
export const kindOf = (kind: string) => kind.trim().toLowerCase()
export const isRun = (kind: string) => kindOf(kind) === 'run'

// A status that means the session happened (it counts as done, a run gets a run log)
export const happened = (status: string | null | undefined): status is 'done' | 'partial' => status === 'done' || status === 'partial'

// What a new status removes: skipped (or a cleared log) can't have pain during, test
// results or a run log: they all need the session to have happened.
export function clearsOnStatus(status: Status | null) {
  const gone = !happened(status)
  return { pain: gone, tests: gone, runLog: gone }
}

// Check-in rows: one per day, area and timing, no session
export type CheckInArea = 'arch' | EveningArea

export function checkInRow(date: string, area: CheckInArea, score: number) {
  if (area === 'arch') return { date, body_area: 'arch', side: 'R', timing: 'next_morning', score, context: 'morning check-in' }
  return { date, body_area: area, side: 'C', timing: 'evening', score, context: area === 'hands' ? 'tingling' : 'evening check-in' }
}

export const checkInTiming = (area: CheckInArea) => (area === 'arch' ? 'next_morning' : 'evening')

// Sessions the watch records, and the sport it records them as
export const WATCH_SPORT: Record<string, string> = { run: 'run', hike: 'hike' }
export const watchSport = (kind: string) => WATCH_SPORT[kindOf(kind)] ?? null

// The watch copy (source 'intervals', same date and sport) of each session that happened,
// in order. Planned or skipped sessions get none. `watch` is the day's watch activities.
export function pairWatch<T extends { kind: string; status: string | null | undefined }>(sessions: T[], watch: WatchActivity[]) {
  const used = new Set<string>()
  return sessions.map((s) => {
    const sport = watchSport(s.kind)
    if (!sport || !happened(s.status)) return null
    const match = watch.find((w) => w.sport === sport && !used.has(w.id)) ?? null
    if (match) used.add(match.id)
    return match
  })
}

// What the database accepts (see supabase/migrations): the demo checks the same
export const LIMITS = {
  score: (n: number) => Number.isInteger(n) && n >= 0 && n <= 10,
  kg: (n: number) => n >= 30 && n <= 250,
  slot: (s: string) => s === 'am' || s === 'pm',
  step: (n: number) => Number.isInteger(n) && n >= 1,
  status: (s: string) => s === 'done' || s === 'partial' || s === 'skipped',
}

export function check(ok: boolean, what: string) {
  if (!ok) throw new Error(`Not a valid ${what}`)
}
