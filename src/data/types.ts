// The shapes the screens work with. Rows come from the tables in database.types.ts;
// a few are joined or trimmed for one screen.
import type { Tables } from '@/lib/database.types'

export type Symptom = Tables<'symptoms'>
export type SessionLog = Tables<'session_logs'> & { symptoms: Symptom[] }
export type Video = Tables<'videos'>
export type Activity = Tables<'activities'>
export type TestResult = Tables<'tests'>
export type RunStep = Tables<'run_steps'>
export type Review = Pick<Tables<'reviews'>, 'id' | 'week_start' | 'summary' | 'decisions' | 'created_at'>
export type Status = 'done' | 'partial' | 'skipped'

export type WatchActivity = Pick<
  Tables<'activities'>,
  'id' | 'date' | 'sport' | 'duration_s' | 'distance_m' | 'hr_avg' | 'load' | 'elevation_m'
>

export type DaySession = Tables<'plan_sessions'> & {
  log: SessionLog | null
  activity: Activity | null // the run log (source 'manual'), for run sessions
  watch: WatchActivity | null // the same run from the watch (source 'intervals', same date)
  tests: TestResult[] // measured results (e.g. heel-raise reps, L and R), for test sessions
  videos: Video[]
}

export type DayDot = { id: string; slot: string; kind: string; status: string | null }

// Was anything logged lately? (for the "welcome back" line)
export type LastLog = { date: string } | null

export type EveningArea = 'neck' | 'hands'

// The day's two check-ins: morning (right arch at first steps, optional weight, and
// whether yesterday's run was clean) and evening (neck and hand tingling over the day)
export type CheckIns = {
  arch: number | null
  neck: number | null
  hands: number | null
  weight: number | null // kg
  run: { planSessionId: string | null; id: string; step: number | null; clean: boolean | null } | null // yesterday's logged run
}

export type NextRun = { date: string; run_step: number | null; title: string }

export type TrendSymptom = { date: string; body_area: string; timing: string; score: number }

export type ProgressData = {
  today: string
  symptoms: TrendSymptom[] // a year, so 6 months can be compared with the 6 before
  runs: Pick<Tables<'activities'>, 'date' | 'run_step' | 'clean'>[] // logged in the app, newest first
  watch: WatchActivity[] // synced from intervals.icu, 6 months, newest first
  tests: Pick<Tables<'tests'>, 'date' | 'test' | 'side' | 'value' | 'unit'>[]
  weights: { date: string; kg: number }[] // a year, oldest first
  nextRun: NextRun | null // the next planned run from today on
  syncedAt: string | null // when the watch data was last copied
}

export type TestRow = { date: string; side: string | null; value: number; plan_session_id: string | null }

export type RunChanges = { run_step?: number; clean?: boolean | null }
export type PainTarget = { body_area: string; side: string | null }
export type TestTarget = { test: string; unit: string }
