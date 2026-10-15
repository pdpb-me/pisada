import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { lastRunStep } from '@/hooks/use-run-steps'
import type { Side, TestSpec } from '@/lib/tests'

export type Symptom = Tables<'symptoms'>
export type SessionLog = Tables<'session_logs'> & { symptoms: Symptom[] }
export type Video = Tables<'videos'>
export type Activity = Tables<'activities'>
export type TestResult = Tables<'tests'>
export type Status = 'done' | 'partial' | 'skipped'

export type DaySession = Tables<'plan_sessions'> & {
  log: SessionLog | null
  activity: Activity | null // the run log, for run sessions
  tests: TestResult[] // measured results (e.g. heel-raise reps, L and R), for test sessions
  videos: Video[]
}

// Loads one day's planned sessions, with their log (if any) and videos.
export function useDay(date: string) {
  const [sessions, setSessions] = useState<DaySession[] | undefined>(undefined)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('plan_sessions')
      .select('*, session_logs(*, symptoms(*)), activities(*), tests(*)')
      .eq('date', date)
      .order('slot')
      .order('created_at')
    if (error) {
      toast.error(`Couldn't load this day: ${error.message}`)
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
      data.map(({ session_logs, activities, tests, ...s }) => ({
        ...s,
        log: session_logs,
        activity: activities,
        tests,
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
            // oxlint-disable-next-line react/purity -- runs on tap, not during render
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
    // Skipped or un-logged: test results for this session go too
    if ((status === 'skipped' || status === null) && session.tests.length) {
      await supabase.from('tests').delete().eq('plan_session_id', session.id)
    }
    if (session.kind === 'run') await syncRun(session, status)
    await load()
  }

  // A run that happened (done/partial) gets a run log, starting at the step of
  // the last logged run. Skipped or un-logged: the run log goes.
  async function syncRun(session: DaySession, status: Status | null) {
    const ran = status === 'done' || status === 'partial'
    if (ran && !session.activity) {
      const { error } = await supabase.from('activities').insert({
        plan_session_id: session.id,
        date: session.date,
        sport: 'run',
        run_step: await lastRunStep(),
        source: 'manual',
      })
      if (error) toast.error(`Run log not saved: ${error.message}`)
    } else if (!ran && session.activity) {
      await supabase.from('activities').delete().eq('id', session.activity.id)
    }
  }

  async function setRun(session: DaySession, changes: { run_step?: number; clean?: boolean | null }) {
    if (!session.activity) return
    const { error } = await supabase.from('activities').update(changes).eq('id', session.activity.id)
    if (error) {
      toast.error(`Run log not saved: ${error.message}`)
      return
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

  // One test result per side (e.g. heel-raise reps). null clears it.
  async function setTest(session: DaySession, spec: TestSpec, side: Side, value: number | null) {
    const { error } =
      value == null
        ? await supabase
            .from('tests')
            .delete()
            .eq('plan_session_id', session.id)
            .eq('test', spec.test)
            .eq('side', side)
        : await supabase.from('tests').upsert(
            { plan_session_id: session.id, date: session.date, test: spec.test, side, value, unit: spec.unit },
            { onConflict: 'plan_session_id,test,side' },
          )
    if (error) {
      toast.error(`Result not saved: ${error.message}`)
      return
    }
    await load()
  }

  return { sessions, setStatus, setPain, setRun, setComment, setTest }
}
