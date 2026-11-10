import { data, READS, write } from '@/data/store'
import type { DaySession, PainTarget, RunChanges, SessionLog, Status, Symptom, VideoRating } from '@/data/types'
import { useQuery } from '@/data/use-query'
import { usePending } from '@/hooks/use-pending'
import { painAreaFor } from '@/lib/pain-areas'
import type { Side, TestSpec } from '@/lib/tests'

// One day's planned sessions, with their log, run log (and its watch copy), tests and
// videos. A status, pain or video-rating tap shows at once.
export function useDay(date: string) {
  const query = useQuery(`day:${date}`, READS.day, () => data.day(date))
  const status = usePending<Status | null>(query.data)
  const pain = usePending<number | null>(query.data)
  const rating = usePending<VideoRating | null>(query.data)

  const sessions = query.data?.map((s): DaySession => {
    let log = s.log
    const st = status.get(s.id)
    if (st) {
      log = st.value ? ({ symptoms: [], comment: null, ...s.log, status: st.value } as SessionLog) : null
      if (log && st.value === 'skipped') log = { ...log, symptoms: log.symptoms.filter((x) => x.timing !== 'during') }
    }
    const area = painAreaFor(s.kind)
    const p = area && pain.get(`${s.id}|${area.body_area}`)
    if (log && area && p) {
      const others = log.symptoms.filter((x) => !(x.body_area === area.body_area && x.timing === 'during'))
      const tapped = { body_area: area.body_area, side: area.side, timing: 'during', score: p.value } as Symptom
      log = { ...log, symptoms: p.value == null ? others : [...others, tapped] }
    }
    let ratings = s.ratings
    for (const v of s.video_ids) {
      const r = rating.get(`${s.id}|${v}`)
      if (!r) continue
      ratings = { ...ratings }
      if (r.value) ratings[v] = r.value
      else delete ratings[v]
    }
    return log === s.log && ratings === s.ratings ? s : { ...s, log, ratings }
  })

  return {
    sessions,
    error: query.error,
    retry: query.retry,
    setStatus: (s: DaySession, value: Status | null) => status.tap(s.id, value, () => write.setStatus(s.id, value)),
    setPain: (s: DaySession, area: PainTarget, score: number | null) =>
      pain.tap(`${s.id}|${area.body_area}`, score, () => write.setPain(s.id, area, score)),
    setRun: (s: DaySession, changes: RunChanges) => write.setRun(s.id, changes),
    setComment: (s: DaySession, comment: string) => write.setComment(s.id, comment.trim() || null),
    setTest: (s: DaySession, spec: TestSpec, side: Side, value: number | null) => write.setTest(s.id, spec, side, value),
    setRating: (s: DaySession, ytId: string, value: VideoRating | null) =>
      rating.tap(`${s.id}|${ytId}`, value, () => write.setRating(s.id, ytId, value)),
    moveSession: (s: DaySession, date: string, slot: string) => write.moveSession(s.id, date, slot),
  }
}
