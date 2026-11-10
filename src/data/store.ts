import { toast } from 'sonner'
import type { Backend } from '@/data/api'
import { backend } from '@/data/backend'

// The app's door to the data.
// - Reads go straight to the backend; each names the tables it reads (for reloading).
// - Writes run one at a time, in the order they were tapped, so two quick taps can't
//   race. When a write is done, only the screens that read the tables it touched
//   reload. If saving fails, a short message says so (and the screens reload, so they
//   show what is really saved).
export type Table =
  | 'plan_sessions'
  | 'session_logs'
  | 'symptoms'
  | 'activities'
  | 'tests'
  | 'weights'
  | 'run_steps'
  | 'reviews'
  | 'videos'
  | 'video_feedback'
  | 'sync_status'
  | 'chat_messages'
  | 'plan_proposals'

const listeners = new Set<(tables: Set<Table>) => void>()

export function onDataChange(listener: (tables: Set<Table>) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function changed(tables: Table[]) {
  const set = new Set(tables)
  for (const l of listeners) l(set)
}

// What each read looks at
export const READS = {
  day: ['plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'videos', 'video_feedback'],
  weekDots: ['plan_sessions', 'session_logs'],
  checkIns: ['symptoms', 'activities', 'weights'],
  runSteps: ['run_steps'],
  lastRunStep: ['activities'],
  lastLog: ['session_logs', 'symptoms'],
  progress: ['symptoms', 'activities', 'tests', 'weights', 'plan_sessions', 'session_logs', 'sync_status'],
  nextTest: ['plan_sessions'],
  testResults: ['tests'],
  watch: ['activities'],
  oldestWatchDate: ['activities'],
  syncedAt: ['sync_status'],
  review: ['reviews'],
  chatMessages: ['chat_messages'],
  chatProposals: ['plan_proposals'],
} satisfies Partial<Record<keyof Backend, Table[]>>

// What each write touches
const WRITES = {
  setStatus: ['session_logs', 'symptoms', 'tests', 'activities', 'video_feedback'],
  setPain: ['symptoms'],
  setRun: ['activities'],
  setComment: ['session_logs'],
  setTest: ['tests'],
  setRating: ['video_feedback'],
  moveSession: ['plan_sessions', 'symptoms', 'activities', 'tests', 'video_feedback'],
  saveCheckIn: ['symptoms'],
  saveClean: ['activities'],
  saveWeight: ['weights'],
  decideProposal: ['plan_proposals', 'plan_sessions', 'symptoms', 'activities', 'tests', 'reviews', 'video_feedback'],
} satisfies Partial<Record<keyof Backend, Table[]>>

export const data = {
  auth: backend.auth,
  day: backend.day,
  weekDots: backend.weekDots,
  checkIns: backend.checkIns,
  runSteps: backend.runSteps,
  lastRunStep: backend.lastRunStep,
  lastLog: backend.lastLog,
  progress: backend.progress,
  nextTest: backend.nextTest,
  testResults: backend.testResults,
  watch: backend.watch,
  oldestWatchDate: backend.oldestWatchDate,
  syncedAt: backend.syncedAt,
  review: backend.review,
  coachAvailable: backend.coachAvailable,
  chatMessages: backend.chatMessages,
  chatProposals: backend.chatProposals,
} satisfies Partial<Backend>

// One write at a time
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run)
  queue = next.catch(() => {})
  return next
}

// A failed save in plain words (the technical message stays in the console)
function failed(what: string, e: unknown) {
  console.error(e)
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  toast.error(`${what}. ${offline ? 'You seem to be offline.' : 'Check your connection and try again.'}`)
}

type Saved<F> = F extends (...args: infer A) => Promise<unknown> ? (...args: A) => Promise<boolean> : never

function save<K extends keyof typeof WRITES>(name: K, what = 'Not saved'): Saved<Backend[K]> {
  const run = backend[name] as (...args: unknown[]) => Promise<unknown>
  return ((...args: unknown[]) =>
    serial(async () => {
      try {
        await run(...args)
        return true
      } catch (e) {
        failed(what, e)
        return false
      } finally {
        changed(WRITES[name] as Table[])
      }
    })) as Saved<Backend[K]>
}

export const write = {
  setStatus: save('setStatus'),
  setPain: save('setPain', 'Pain not saved'),
  setRun: save('setRun', 'Run log not saved'),
  setComment: save('setComment', 'Note not saved'),
  setTest: save('setTest', 'Result not saved'),
  setRating: save('setRating', 'Rating not saved'),
  moveSession: save('moveSession', 'Not moved'),
  saveCheckIn: save('saveCheckIn'),
  saveClean: save('saveClean'),
  saveWeight: save('saveWeight', 'Weight not saved'),
  decideProposal: save('decideProposal', 'Proposal not saved'),
}

// "Sync now": how many activities came in, or null when it failed (after telling the user)
export function syncNow() {
  return serial(async () => {
    try {
      return await backend.syncNow()
    } catch (e) {
      toast.error(`Couldn’t sync: ${(e as Error).message}`)
      return null
    } finally {
      changed(['activities', 'sync_status'])
    }
  })
}

// A message to the coach. Not one of the writes above: the reply can take a while, and
// nothing else should wait for it. Answers with what went wrong, in plain words, or null.
export async function sendChat(text: string, onReply: (soFar: string) => void): Promise<string | null> {
  try {
    await backend.sendChat(text, onReply)
    return null
  } catch (e) {
    console.error(e)
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return offline ? 'You seem to be offline.' : e instanceof Error ? e.message : 'The message was not sent.'
  } finally {
    changed(['chat_messages', 'plan_proposals'])
  }
}

// Everything may have changed elsewhere (the coach, the watch sync): reload all
export function refreshAll() {
  changed(['plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'weights', 'run_steps', 'reviews', 'videos', 'video_feedback', 'sync_status', 'chat_messages', 'plan_proposals'])
}
