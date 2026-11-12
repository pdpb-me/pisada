import type {
  ChatMessage,
  CheckIns,
  DayDot,
  DaySession,
  EveningArea,
  LastLog,
  PainTarget,
  ProgressData,
  Proposal,
  Review,
  RunChanges,
  RunStep,
  Status,
  TestRow,
  TestTarget,
  VideoRating,
  WatchActivity,
} from '@/data/types'
import type { Hand } from '@/lib/tingling'
import type { Trigger } from '@/lib/triggers'

// Everything the app reads and writes, in its own words. Two implementations:
// src/data/supabase.ts (the real app) and src/demo/memory.ts (the demo, made-up data).
// Both follow src/data/rules.ts. Reads and writes throw an Error with a plain message.
//
// Writes name what they change by id or by date and say the result wanted; each backend
// works from what the database holds then, never from a copy a screen loaded earlier.
export interface Backend {
  auth: {
    signedIn(): Promise<boolean>
    onChange(listener: (signedIn: boolean) => void): () => void
    sendCode(email: string): Promise<void>
    verify(email: string, code: string): Promise<void>
    signOut(): Promise<void>
  }

  // Reads
  day(date: string): Promise<DaySession[]>
  weekDots(from: string, to: string): Promise<Record<string, DayDot[]>>
  checkIns(date: string): Promise<CheckIns>
  runSteps(): Promise<RunStep[]>
  lastRunStep(): Promise<number> // the step of the most recently logged run, 1 if none
  lastLog(before: string): Promise<LastLog> // the latest day before this one with a log or a check-in
  progress(today: string): Promise<ProgressData>
  nextTest(today: string): Promise<{ date: string } | null>
  testResults(test: string): Promise<TestRow[]> // every result of one test, oldest first
  watch(from: string, to: string): Promise<WatchActivity[]> // newest first
  oldestWatchDate(): Promise<string | null>
  syncedAt(): Promise<string | null>
  review(weekStart: string): Promise<Review | null> // the coach's note for that week, or the latest before it
  coachAvailable(): Promise<boolean> // does this login have the chat with the coach?
  chatMessages(): Promise<ChatMessage[]> // oldest first
  chatProposals(): Promise<Proposal[]> // oldest first

  // Writes
  setStatus(planSessionId: string, status: Status | null): Promise<void>
  setPain(planSessionId: string, area: PainTarget, score: number | null): Promise<void>
  setRun(planSessionId: string, changes: RunChanges): Promise<void>
  setComment(planSessionId: string, comment: string | null): Promise<void>
  setTest(planSessionId: string, spec: TestTarget, side: string, value: number | null): Promise<void>
  setRating(planSessionId: string, ytId: string, rating: VideoRating | null): Promise<void> // one per session and video; null removes it
  moveSession(planSessionId: string, date: string, slot: string): Promise<void>
  saveCheckIn(date: string, area: 'arch' | EveningArea, score: number | null): Promise<void>
  saveCheckInDetails(date: string, area: EveningArea, details: { side?: Hand | null; triggers?: Trigger[] }): Promise<void> // which hand, what it came with: after the main answer
  saveClean(runLogId: string, clean: boolean | null): Promise<void>
  saveWeight(date: string, kg: number | null): Promise<void>
  syncNow(): Promise<{ count: number; synced_at: string }>
  sendChat(text: string, onReply: (soFar: string) => void): Promise<void> // saves the message and the coach's reply, which arrives a piece at a time
  decideProposal(id: string, apply: boolean): Promise<void> // all or nothing; if the plan changed in the meantime, nothing is applied and its status says so
}
