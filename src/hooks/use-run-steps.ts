import { data } from '@/data/store'
import { useQuery } from '@/data/use-query'

export type { RunStep } from '@/data/types'

// The ladder steps, as stored in the run_steps table (the coaching chat adds more)
export function useRunSteps() {
  return useQuery('run-steps', data.runSteps).data ?? []
}

// The step of the most recently logged run: the default for the next one
export function useLastRunStep() {
  return useQuery('last-run-step', data.lastRunStep).data ?? null
}
