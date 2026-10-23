// The run–walk ladder: shared wording, and where Pedro stands on it.
// The app never moves the step: the coach plans it at the weekly check-in.

// Minutes as written in the app: '2', '1.5'
export function num(n: number | string) {
  return String(Number(n))
}

// The rules in short lines, with the pain words the app asks
export const LADDER_RULES = [
  'Clean run: the arch stayed None or Mild, and was back to normal the next morning.',
  'Up a step after 2 clean runs in a row.',
  'Soreness that stays the next morning: same step.',
  'Pain above Mild during the run: one step down.',
  'Your coach decides the step at the weekly check-in. Nothing changes by itself.',
]

export type LoggedRun = { date: string; run_step: number | null; clean: boolean | null }
export type PlannedRun = { date: string; run_step: number | null; title: string }

export type LadderStatus = {
  next: PlannedRun | null // the next planned run (its step may not be set yet)
  last: LoggedRun | null // the latest logged run
  recent: LoggedRun[] // up to 4 latest runs, oldest first
  cleanInARow: number // clean runs in a row at the last run's step (undecided ones are skipped over)
}

// runs: logged in the app, newest first
export function ladderStatus(runs: LoggedRun[], next: PlannedRun | null): LadderStatus {
  const last = runs[0] ?? null
  let cleanInARow = 0
  for (const r of runs) {
    if (r.run_step !== last?.run_step) break
    if (r.clean == null) continue // not decided yet: neither counts nor breaks
    if (!r.clean) break
    cleanInARow++
  }
  return { next, last, recent: runs.slice(0, 4).reverse(), cleanInARow }
}
