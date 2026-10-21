// A rough time for a session, shown in Today's plan as "~25 min".
// Drawn exercises: their typical time (catalog). Videos: their real length.
// Runs: the whole ladder step (warm-up + run/walk + cool-down). Pilates: the class.
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession } from '@/hooks/use-day'
import type { RunStep } from '@/hooks/use-run-steps'

const CLASS_MINUTES = 60

export function sessionMinutes(s: DaySession, steps: RunStep[], currentStep: number | null): number | null {
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
    const step = steps.find((st) => st.step === (s.activity?.run_step ?? currentStep))
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

// The ladder step a run will use: its own if logged, else the last logged run's
export function runStepFor(s: DaySession, currentStep: number | null) {
  return s.activity?.run_step ?? currentStep
}
