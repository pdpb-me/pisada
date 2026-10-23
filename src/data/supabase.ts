// The real backend: Pedro's Supabase project. Only this file and supabase-client.ts
// talk to Supabase; the demo build swaps it out (see src/data/backend.ts).
import type { Backend } from '@/data/api'
import { supabase } from '@/data/supabase-client'
import type { DayDot, DaySession, Evening, EveningArea, Video, WatchActivity } from '@/data/types'
import { addDays } from '@/lib/dates'
import { now } from '@/lib/clock'

const WATCH_COLUMNS = 'id, date, sport, duration_s, distance_m, hr_avg, load, elevation_m'

type Result<T> = { data: T | null; error: { message: string } | null }

// Throws the error's message, so callers can show it. Lists come back as [] rather than null.
function check<T>(res: Result<T[]>): T[]
function check<T>(res: Result<T>): T | null
function check<T>(res: Result<T>) {
  if (res.error) throw new Error(res.error.message)
  return res.data ?? (Array.isArray(res.data) ? [] : res.data)
}

// Evening check-in rows: one per area per day (timing 'evening', no session)
const EVENING_ROW: Record<EveningArea, { side: string; context: string }> = {
  neck: { side: 'C', context: 'evening check-in' },
  hands: { side: 'C', context: 'tingling' },
}

// The run's watch copy (source 'intervals', same date), for each run session of a day, in order
export function pairWatchRuns<T extends { kind: string }>(sessions: T[], runs: WatchActivity[]) {
  let next = 0
  return sessions.map((s) => (s.kind === 'run' ? (runs[next++] ?? null) : null))
}

async function lastRunStep() {
  const data = check(
    await supabase
      .from('activities')
      .select('run_step')
      .eq('sport', 'run')
      .not('run_step', 'is', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
  )
  return data[0]?.run_step ?? 1
}

export const backend: Backend = {
  auth: {
    async signedIn() {
      const { data } = await supabase.auth.getSession()
      return data.session != null
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, s) => listener(s != null))
      return () => data.subscription.unsubscribe()
    },
    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw new Error(error.message)
    },
    async verify(email, token) {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw new Error(error.message)
    },
    async signOut() {
      await supabase.auth.signOut()
    },
  },

  async day(date) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('*, session_logs(*, symptoms(*)), activities(*), tests(*)')
        .eq('date', date)
        .order('slot')
        .order('created_at'),
    )
    const ids = [...new Set(data.flatMap((s) => s.video_ids))]
    const hasRun = data.some((s) => s.kind === 'run')
    const [videos, runs] = await Promise.all([
      ids.length ? supabase.from('videos').select('*').in('yt_id', ids).then((r) => check(r)) : ([] as Video[]),
      hasRun
        ? supabase
            .from('activities')
            .select(WATCH_COLUMNS)
            .eq('source', 'intervals')
            .eq('sport', 'run')
            .eq('date', date)
            .order('created_at')
            .then((r) => check(r))
        : ([] as WatchActivity[]),
    ])
    const watch = pairWatchRuns(data, runs)
    return data.map(({ session_logs, activities, tests, ...s }, i): DaySession => ({
      ...s,
      log: session_logs,
      activity: activities,
      watch: watch[i],
      tests,
      // keep the order the plan lists them in
      videos: s.video_ids.flatMap((id) => videos.filter((v) => v.yt_id === id)),
    }))
  },

  async weekDots(from, to) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('id, date, slot, kind, session_logs(status)')
        .gte('date', from)
        .lte('date', to)
        .order('slot')
        .order('created_at'),
    )
    const byDay: Record<string, DayDot[]> = {}
    for (const s of data) {
      ;(byDay[s.date] ??= []).push({ id: s.id, slot: s.slot, kind: s.kind, status: s.session_logs?.status ?? null })
    }
    return byDay
  },

  async runSteps() {
    return check(await supabase.from('run_steps').select('*').order('step'))
  },

  lastRunStep,

  async morning(date) {
    const [arch, run, kg] = await Promise.all([
      supabase
        .from('symptoms')
        .select('id, score')
        .eq('date', date)
        .eq('body_area', 'arch')
        .eq('timing', 'next_morning')
        .limit(1)
        .then((r) => check(r)),
      supabase
        .from('activities')
        .select('id, clean')
        .eq('date', addDays(date, -1))
        .eq('sport', 'run')
        .neq('source', 'intervals') // the run you logged, not its watch copy
        .limit(1)
        .then((r) => check(r)),
      supabase.from('weights').select('kg').eq('date', date).maybeSingle().then((r) => check(r)),
    ])
    return { arch: arch[0] ?? null, run: run[0] ?? null, weight: kg ? Number(kg.kg) : null }
  },

  async evening(date) {
    const data = check(
      await supabase
        .from('symptoms')
        .select('id, body_area, score')
        .eq('date', date)
        .eq('timing', 'evening')
        .is('session_log_id', null),
    )
    const answers: Evening = {}
    for (const s of data) if (s.body_area in EVENING_ROW) answers[s.body_area as EveningArea] = { id: s.id, score: s.score }
    return answers
  },

  async progress(today) {
    const [symptoms, runs, watch, tests, weights] = await Promise.all([
      supabase
        .from('symptoms')
        .select('date, body_area, timing, score')
        .gte('date', addDays(today, -364))
        .lte('date', today)
        .then((r) => check(r)),
      supabase
        .from('activities')
        .select('date, run_step, clean')
        .eq('sport', 'run')
        .neq('source', 'intervals')
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(30)
        .then((r) => check(r)),
      supabase
        .from('activities')
        .select(WATCH_COLUMNS)
        .eq('source', 'intervals')
        .gte('date', addDays(today, -182))
        .lte('date', today)
        .order('date', { ascending: false })
        .then((r) => check(r)),
      supabase.from('tests').select('date, test, side, value, unit').lte('date', today).order('date').then((r) => check(r)),
      supabase
        .from('weights')
        .select('date, kg')
        .gte('date', addDays(today, -364))
        .lte('date', today)
        .order('date')
        .then((r) => check(r)),
    ])
    return { today, symptoms, runs, watch, tests, weights: weights.map((w) => ({ date: w.date, kg: Number(w.kg) })) }
  },

  async nextTest(today) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('date')
        .contains('exercises', ['sl_heel_raise_test'])
        .gte('date', today)
        .order('date')
        .limit(1),
    )
    return data[0] ?? null
  },

  async watch(from, to) {
    return check(
      await supabase
        .from('activities')
        .select(WATCH_COLUMNS)
        .eq('source', 'intervals')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false }),
    )
  },

  async oldestWatchDate() {
    const data = check(await supabase.from('activities').select('date').eq('source', 'intervals').order('date').limit(1))
    return data[0]?.date ?? null
  },

  async syncedAt() {
    const data = check(await supabase.from('sync_status').select('synced_at').eq('source', 'intervals').maybeSingle())
    return data?.synced_at ?? null
  },

  async review(weekStart) {
    const data = check(
      await supabase
        .from('reviews')
        .select('id, week_start, summary, decisions, created_at')
        .lte('week_start', weekStart)
        .order('week_start', { ascending: false })
        .limit(1),
    )
    return data[0] ?? null
  },

  // Save (or clear) the status of one session. Skipped clears pain during and test
  // results; a run that happened gets a run log, a run that didn't loses it.
  async setStatus(session, status) {
    if (status) {
      check(
        await supabase
          .from('session_logs')
          .upsert(
            { plan_session_id: session.id, status, logged_at: now().toISOString() },
            { onConflict: 'plan_session_id' },
          ),
      )
    } else {
      check(await supabase.from('session_logs').delete().eq('plan_session_id', session.id))
    }
    if (status === 'skipped' && session.log?.symptoms.length) {
      check(await supabase.from('symptoms').delete().eq('session_log_id', session.log.id))
    }
    if ((status === 'skipped' || status === null) && session.tests.length) {
      check(await supabase.from('tests').delete().eq('plan_session_id', session.id))
    }
    if (session.kind !== 'run') return
    // The run log starts at the planned step, else the last logged run's (Pedro can change it)
    const ran = status === 'done' || status === 'partial'
    if (ran && !session.activity) {
      check(
        await supabase.from('activities').insert({
          plan_session_id: session.id,
          date: session.date,
          sport: 'run',
          run_step: session.run_step ?? (await lastRunStep()),
          source: 'manual',
        }),
      )
    } else if (!ran && session.activity) {
      check(await supabase.from('activities').delete().eq('id', session.activity.id))
    }
  },

  // Pain during a session (one score per body area). null clears it.
  async setPain(session, area, score) {
    const log = session.log
    if (!log?.id) return
    if (score == null) {
      check(
        await supabase
          .from('symptoms')
          .delete()
          .eq('session_log_id', log.id)
          .eq('body_area', area.body_area)
          .eq('timing', 'during'),
      )
      return
    }
    check(
      await supabase.from('symptoms').upsert(
        { session_log_id: log.id, date: session.date, body_area: area.body_area, side: area.side, timing: 'during', score },
        { onConflict: 'session_log_id,body_area,timing' },
      ),
    )
  },

  async setRun(activityId, changes) {
    check(await supabase.from('activities').update(changes).eq('id', activityId))
  },

  async setComment(planSessionId, comment) {
    check(await supabase.from('session_logs').update({ comment }).eq('plan_session_id', planSessionId))
  },

  // One test result per side (e.g. heel-raise reps). null clears it.
  async setTest(session, spec, side, value) {
    if (value == null) {
      check(
        await supabase.from('tests').delete().eq('plan_session_id', session.id).eq('test', spec.test).eq('side', side),
      )
      return
    }
    check(
      await supabase
        .from('tests')
        .upsert(
          { plan_session_id: session.id, date: session.date, test: spec.test, side, value, unit: spec.unit },
          { onConflict: 'plan_session_id,test,side' },
        ),
    )
  },

  // Move a session to another day (and/or slot). Anything logged for it moves too.
  async moveSession(session, date, slot) {
    check(await supabase.from('plan_sessions').update({ date, slot }).eq('id', session.id))
    if (date === session.date) return
    await Promise.all([
      session.log?.id && supabase.from('symptoms').update({ date }).eq('session_log_id', session.log.id).then((r) => check(r)),
      session.activity && supabase.from('activities').update({ date }).eq('id', session.activity.id).then((r) => check(r)),
      session.tests.length && supabase.from('tests').update({ date }).eq('plan_session_id', session.id).then((r) => check(r)),
    ])
  },

  // Morning arch (first steps): one answer per morning
  async saveArch(date, score) {
    const existing = (await backend.morning(date)).arch
    if (score == null) {
      if (existing) check(await supabase.from('symptoms').delete().eq('id', existing.id))
    } else if (existing) {
      check(await supabase.from('symptoms').update({ score }).eq('id', existing.id))
    } else {
      check(
        await supabase
          .from('symptoms')
          .insert({ date, body_area: 'arch', side: 'R', timing: 'next_morning', score, context: 'morning check-in' }),
      )
    }
  },

  async saveClean(activityId, clean) {
    check(await supabase.from('activities').update({ clean }).eq('id', activityId))
  },

  // One weight per day, so a new value corrects it; null removes it
  async saveWeight(date, kg) {
    if (kg == null) check(await supabase.from('weights').delete().eq('date', date))
    else check(await supabase.from('weights').upsert({ date, kg }, { onConflict: 'user_id,date' }))
  },

  async saveEvening(date, area, score) {
    const existing = (await backend.evening(date))[area]
    if (score == null) {
      if (existing) check(await supabase.from('symptoms').delete().eq('id', existing.id))
    } else if (existing) {
      check(await supabase.from('symptoms').update({ score }).eq('id', existing.id))
    } else {
      check(await supabase.from('symptoms').insert({ date, body_area: area, timing: 'evening', score, ...EVENING_ROW[area] }))
    }
  },

  // "Sync now": the Edge Function sync-intervals copies the last 7 days from intervals.icu
  async syncNow() {
    const { data, error } = await supabase.functions.invoke<{ count: number; synced_at: string }>('sync-intervals', {
      method: 'POST',
    })
    if (error) {
      // the function's own message, when it sent one
      const body = await (error.context as Response | undefined)?.json?.().catch(() => null)
      throw new Error(body?.error ?? error.message)
    }
    return { count: data?.count ?? 0, synced_at: data?.synced_at ?? now().toISOString() }
  },
}
