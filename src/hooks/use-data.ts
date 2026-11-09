// The screens' data, one small hook per thing shown. Each returns the data (undefined
// while loading), an error message if loading failed, and retry.
import { data, READS } from '@/data/store'
import { useQuery } from '@/data/use-query'

export function useWeekDots(from: string, to: string) {
  return useQuery(`week:${from}:${to}`, READS.weekDots, () => data.weekDots(from, to), { keepPrevious: true })
}

export function useRunSteps() {
  return useQuery('run-steps', READS.runSteps, data.runSteps).data ?? []
}

// The step of the most recently logged run: the default for a run with no planned step
export function useLastRunStep() {
  return useQuery('last-run-step', READS.lastRunStep, data.lastRunStep).data ?? null
}

export function useLastLog(before: string) {
  return useQuery(`last-log:${before}`, READS.lastLog, () => data.lastLog(before))
}

export function useReview(weekStart: string) {
  return useQuery(`review:${weekStart}`, READS.review, () => data.review(weekStart))
}

// false while loading, and if it can't be read: the tab just stays away
export function useCoachAvailable(signedIn: boolean) {
  return useQuery(`coach-available:${signedIn}`, [], async () => signedIn && data.coachAvailable()).data ?? false
}

export function useChatMessages() {
  return useQuery('chat-messages', READS.chatMessages, () => data.chatMessages(), { keepPrevious: true })
}

export function useChatProposals() {
  return useQuery('chat-proposals', READS.chatProposals, () => data.chatProposals(), { keepPrevious: true })
}

export function useProgress(today: string) {
  return useQuery(`progress:${today}`, READS.progress, () => data.progress(today), { keepPrevious: true })
}

export function useNextTest(today: string) {
  return useQuery(`next-test:${today}`, READS.nextTest, () => data.nextTest(today)).data ?? null
}

export function useTestResults(test: string) {
  return useQuery(`tests:${test}`, READS.testResults, () => data.testResults(test))
}
