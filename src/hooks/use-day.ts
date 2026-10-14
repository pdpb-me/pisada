import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Symptom = Tables<'symptoms'>
export type SessionLog = Tables<'session_logs'> & { symptoms: Symptom[] }
export type Video = Tables<'videos'>
export type Status = 'done' | 'partial' | 'skipped'

export type DaySession = Tables<'plan_sessions'> & {
  log: SessionLog | null
  videos: Video[]
}

// Loads one day's planned sessions, with their log (if any) and videos.
export function useDay(date: string) {
  const [sessions, setSessions] = useState<DaySession[] | undefined>(undefined)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('plan_sessions')
      .select('*, session_logs(*, symptoms(*))')
      .eq('date', date)
      .order('slot')
      .order('created_at')
    if (error) {
      toast.error(`Couldn't load today: ${error.message}`)
      setSessions([])
      return
    }

    const ids = [...new Set(data.flatMap((s) => s.video_ids))]
    let videos: Video[] = []
    if (ids.length > 0) {
      const res = await supabase.from('videos').select('*').in('yt_id', ids)
      videos = res.data ?? []
    }

    setSessions(
      data.map(({ session_logs, ...s }) => ({
        ...s,
        log: session_logs,
        // keep the order the plan lists them in
        videos: s.video_ids.flatMap((id) => videos.filter((v) => v.yt_id === id)),
      })),
    )
  }, [date])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    load()
  }, [load])

  // Save (or clear) the status of one session. Updates the screen straight
  // away and puts it back if saving fails.
  async function setStatus(session: DaySession, status: Status | null) {
    const previous = sessions
    setSessions((list) =>
      list?.map((s) =>
        s.id !== session.id
          ? s
          : {
              ...s,
              log: status
                ? ({ symptoms: [], ...(s.log ?? { comment: null }), status } as SessionLog)
                : null,
            },
      ),
    )

    const { error } = status
      ? await supabase
          .from('session_logs')
          .upsert(
            { plan_session_id: session.id, status, logged_at: new Date().toISOString() },
            { onConflict: 'plan_session_id' },
          )
      : await supabase.from('session_logs').delete().eq('plan_session_id', session.id)

    if (error) {
      setSessions(previous)
      toast.error(`Not saved: ${error.message}`)
      return
    }
    if (status === 'skipped' && session.log?.symptoms.length) {
      await supabase.from('symptoms').delete().eq('session_log_id', session.log.id)
    }
    await load()
  }

  // Pain during a session (one score per body area). null clears it.
  async function setPain(
    session: DaySession,
    area: { body_area: string; side: string | null },
    score: number | null,
  ) {
    const log = session.log
    if (!log?.id) return // the log is still being saved; the scale is shown once it exists

    const { error } =
      score == null
        ? await supabase
            .from('symptoms')
            .delete()
            .eq('session_log_id', log.id)
            .eq('body_area', area.body_area)
            .eq('timing', 'during')
        : await supabase.from('symptoms').upsert(
            {
              session_log_id: log.id,
              date: session.date,
              body_area: area.body_area,
              side: area.side,
              timing: 'during',
              score,
            },
            { onConflict: 'session_log_id,body_area,timing' },
          )
    if (error) {
      toast.error(`Pain not saved: ${error.message}`)
      return
    }
    await load()
  }

  async function setComment(session: DaySession, comment: string) {
    const { error } = await supabase
      .from('session_logs')
      .update({ comment: comment.trim() || null })
      .eq('plan_session_id', session.id)
    if (error) {
      toast.error(`Comment not saved: ${error.message}`)
      return false
    }
    toast.success('Comment saved')
    await load()
    return true
  }

  return { sessions, setStatus, setPain, setComment }
}
