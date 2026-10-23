// How a session is named and described in lists
import type { DaySession, RunStep } from '@/data/types'
import { exerciseFor } from '@/exercises/catalog'
import { plural } from '@/lib/format'
import { runStepFor, sessionMinutes } from '@/lib/session-time'
import { testFor } from '@/lib/tests'

export const SLOT_WORD: Record<string, string> = { am: 'Morning', pm: 'Evening' }
const KIND_WORD: Record<string, string> = {
  neck: 'Neck',
  tendon: 'Tendon',
  run: 'Run',
  stability: 'Stability',
  mobility: 'Mobility',
  pilates: 'Pilates',
  test: 'Test',
  hike: 'Hike',
}
export const kindWord = (kind: string) => KIND_WORD[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1)

// What a row says under the title before the session is logged, with a rough time:
// "3 exercises + 1 video · ~13 min"
export function sessionMeta(s: DaySession, steps: RunStep[]) {
  const minutes = sessionMinutes(s, steps)
  const time = minutes != null ? `~${minutes} min` : null // no-break space: "~32 min" wraps as one
  let what: string
  const test = testFor(s.exercises)
  const step = runStepFor(s)
  const label = step != null && steps.find((st) => st.step === step)?.label
  if (s.kind === 'pilates') what = 'Class with your teacher'
  else if (test) what = 'Test · reps per side'
  else if (s.kind === 'run' && step == null) what = 'Step not set yet'
  else if (s.kind === 'run' && label) what = `Step ${step} · ${label}`
  else if (s.kind === 'run') what = `Step ${step} (not in the ladder)`
  else {
    const exercises = s.exercises.filter((slug) => exerciseFor(slug)).length
    const parts = [exercises > 0 && plural(exercises, 'exercise'), s.videos.length > 0 && plural(s.videos.length, 'video')]
    what = parts.filter(Boolean).join(' + ')
  }
  if (!what) return [s.instructions, time].filter(Boolean).join(' · ')
  return [what, time].filter(Boolean).join(' · ')
}
