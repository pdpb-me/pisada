import { useEffect, useState } from 'react'
import { data, write } from '@/data/store'
import type { DaySession, PainTarget, RunChanges, SessionLog, Status } from '@/data/types'
import { useQuery } from '@/data/use-query'
import type { Side, TestSpec } from '@/lib/tests'

export type { Activity, DaySession, SessionLog, Status, Symptom, TestResult, Video } from '@/data/types'

// One day's planned sessions, with their log, run log (and its watch copy), tests and videos.
export function useDay(date: string) {
  const query = useQuery(`day:${date}`, () => data.day(date))
  // A status shows the moment it's tapped, before it's saved (put back if saving fails)
  // (saved: the write is done; the entry goes once the reloaded day is in)
  const [pending, setPending] = useState<Record<string, { status: Status | null; saved: boolean }>>({})
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- dropping taps the reloaded data now shows
    setPending((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => !v.saved)))
  }, [query.data])

  const sessions = query.data?.map((s): DaySession => {
    const tap = pending[s.id]
    if (!tap) return s
    return { ...s, log: tap.status ? ({ symptoms: [], ...(s.log ?? { comment: null }), status: tap.status } as SessionLog) : null }
  })

  async function setStatus(session: DaySession, status: Status | null) {
    setPending((p) => ({ ...p, [session.id]: { status, saved: false } }))
    await write.setStatus(session, status)
    setPending((p) => (p[session.id] ? { ...p, [session.id]: { ...p[session.id], saved: true } } : p))
  }

  return {
    sessions,
    error: query.error,
    setStatus,
    setPain: (s: DaySession, area: PainTarget, score: number | null) => write.setPain(s, area, score),
    setRun: (s: DaySession, changes: RunChanges) => (s.activity ? write.setRun(s.activity.id, changes) : Promise.resolve(false)),
    setComment: async (s: DaySession, comment: string) => {
      const ok = await write.setComment(s.id, comment.trim() || null)
      return ok
    },
    setTest: (s: DaySession, spec: TestSpec, side: Side, value: number | null) => write.setTest(s, spec, side, value),
    moveSession: (s: DaySession, date: string, slot: string) => write.moveSession(s, date, slot),
  }
}
