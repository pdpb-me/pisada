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

export type Answer = { id: string; score: number }

export type Morning = {
  arch: Answer | null // right arch, first steps
  run: { id: string; clean: boolean | null } | null // yesterday's logged run, if any
  weight: number | null // kg, optional
}

export type EveningArea = 'neck' | 'hands'
export type Evening = Partial<Record<EveningArea, Answer>>

export type TrendSymptom = { date: string; body_area: string; timing: string; score: number }

export type ProgressData = {
  today: string
  symptoms: TrendSymptom[] // a year, so 6 months can be compared with the 6 before
  runs: Pick<Tables<'activities'>, 'date' | 'run_step' | 'clean'>[] // logged in the app, newest first
  watch: WatchActivity[] // synced from intervals.icu, 6 months, newest first
  tests: Pick<Tables<'tests'>, 'date' | 'test' | 'side' | 'value' | 'unit'>[]
  weights: { date: string; kg: number }[] // a year, oldest first
}

export type RunChanges = { run_step?: number; clean?: boolean | null }
export type PainTarget = { body_area: string; side: string | null }
export type TestTarget = { test: string; unit: string }
