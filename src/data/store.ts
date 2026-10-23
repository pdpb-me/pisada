import { toast } from 'sonner'
import { backend } from '@/data/backend'
import type { Backend } from '@/data/api'

// The app's door to the data. Reads go straight to the backend. Writes tell every
// screen that data changed (so each one reloads what it shows: no manual refresh
// plumbing), and show a short message when saving fails.
const listeners = new Set<() => void>()

export function onDataChange(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function changed() {
  for (const l of listeners) l()
}

type Writes = Omit<Backend, 'auth' | 'syncNow' | Reads>
type Reads =
  | 'day'
  | 'weekDots'
  | 'runSteps'
  | 'lastRunStep'
  | 'morning'
  | 'evening'
  | 'progress'
  | 'nextTest'
  | 'watch'
  | 'oldestWatchDate'
  | 'syncedAt'
  | 'review'

// A write that resolves to true when saved, false when not (after telling the user)
type Saved<F> = F extends (...args: infer A) => Promise<unknown> ? (...args: A) => Promise<boolean> : never

function save<F extends (...args: never[]) => Promise<unknown>>(write: F, what = 'Not saved'): Saved<F> {
  return (async (...args: Parameters<F>) => {
    try {
      await write(...args)
      return true
    } catch (e) {
      toast.error(`${what}: ${(e as Error).message}`)
      return false
    } finally {
      changed()
    }
  }) as Saved<F>
}

export const data = {
  auth: backend.auth,
  day: backend.day,
  weekDots: backend.weekDots,
  runSteps: backend.runSteps,
  lastRunStep: backend.lastRunStep,
  morning: backend.morning,
  evening: backend.evening,
  progress: backend.progress,
  nextTest: backend.nextTest,
  watch: backend.watch,
  oldestWatchDate: backend.oldestWatchDate,
  syncedAt: backend.syncedAt,
  review: backend.review,
} satisfies Pick<Backend, 'auth' | Reads>

export const write: { [K in keyof Writes]: Saved<Writes[K]> } = {
  setStatus: save(backend.setStatus),
  setPain: save(backend.setPain, 'Pain not saved'),
  setRun: save(backend.setRun, 'Run log not saved'),
  setComment: save(backend.setComment, 'Comment not saved'),
  setTest: save(backend.setTest, 'Result not saved'),
  moveSession: save(backend.moveSession, 'Not moved'),
  saveArch: save(backend.saveArch),
  saveClean: save(backend.saveClean),
  saveWeight: save(backend.saveWeight, 'Weight not saved'),
  saveEvening: save(backend.saveEvening),
}

// "Sync now": how many activities came in, or null when it failed (after telling the user)
export async function syncNow() {
  try {
    return await backend.syncNow()
  } catch (e) {
    toast.error(`Couldn’t sync: ${(e as Error).message}`)
    return null
  } finally {
    changed()
  }
}
