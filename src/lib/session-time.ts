// A rough time for a session, shown in Today's plan as "~25 min".
// Drawn exercises: their typical time (catalog). Videos: their real length.
// Runs: the whole ladder step (warm-up + run/walk + cool-down). Pilates: the class.
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession, RunStep } from '@/data/types'

const CLASS_MINUTES = 60

export function sessionMinutes(s: DaySession, steps: RunStep[]): number | null {
  let total = 0
  let known = false
  for (const slug of s.exercises) {
    const ex = exerciseFor(slug)
    if (ex) {
      total += ex.minutes
      known = true
    }
  }
  for (const v of s.videos) {
    if (v.duration_s != null) {
      total += v.duration_s / 60
      known = true
    }
  }
  if (s.kind === 'run') {
    const step = steps.find((st) => st.step === runStepFor(s))
    if (step) {
      total += runStepMinutes(step)
      known = true
    }
  }
  if (s.kind === 'pilates' && !known) return CLASS_MINUTES
  return known ? Math.max(1, Math.round(total)) : null
}

// A whole ladder step: warm-up walk + run–walk reps + cool-down walk
export function runStepMinutes(step: RunStep) {
  return Number(step.warmup_min) + Number(step.reps) * (Number(step.run_min) + Number(step.walk_min)) + Number(step.cooldown_min)
}

// The ladder step a run will use: its own if logged, else the planned one (set at the
// weekly check-in). null: not set yet (the coach hasn't planned it; nothing goes to the
// watch). The last logged step is only a suggestion for the log, never shown as the plan.
export function runStepFor(s: DaySession) {
  return s.activity?.run_step ?? s.run_step ?? null
}
