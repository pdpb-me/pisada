import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type SessionLog = Tables<'session_logs'>
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
      .select('*, session_logs(*)')
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
                ? ({ ...(s.log ?? { comment: null }), status } as SessionLog)
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

  return { sessions, setStatus, setComment }
}
