import type {
  DayDot,
  DaySession,
  Evening,
  EveningArea,
  Morning,
  PainTarget,
  ProgressData,
  Review,
  RunChanges,
  RunStep,
  Status,
  TestTarget,
  WatchActivity,
} from '@/data/types'

// Everything the app reads and writes, in its own words. Two implementations:
// src/data/supabase.ts (the real app) and src/demo/memory.ts (the demo, made-up data).
// Reads and writes throw an Error with a plain message when they fail.
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
  runSteps(): Promise<RunStep[]>
  lastRunStep(): Promise<number> // the step of the most recently logged run, 1 if none
  morning(date: string): Promise<Morning>
  evening(date: string): Promise<Evening>
  progress(today: string): Promise<ProgressData>
  nextTest(today: string): Promise<{ date: string } | null>
  watch(from: string, to: string): Promise<WatchActivity[]> // newest first
  oldestWatchDate(): Promise<string | null>
  syncedAt(): Promise<string | null>
  review(weekStart: string): Promise<Review | null> // the coach's note for that week, or the latest before it

  // Writes
  setStatus(session: DaySession, status: Status | null): Promise<void>
  setPain(session: DaySession, area: PainTarget, score: number | null): Promise<void>
  setRun(activityId: string, changes: RunChanges): Promise<void>
  setComment(planSessionId: string, comment: string | null): Promise<void>
  setTest(session: DaySession, spec: TestTarget, side: string, value: number | null): Promise<void>
  moveSession(session: DaySession, date: string, slot: string): Promise<void>
  saveArch(date: string, score: number | null): Promise<void>
  saveClean(activityId: string, clean: boolean | null): Promise<void>
  saveWeight(date: string, kg: number | null): Promise<void>
  saveEvening(date: string, area: EveningArea, score: number | null): Promise<void>
  syncNow(): Promise<{ count: number; synced_at: string }>
}
