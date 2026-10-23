// The real backend: Pedro's Supabase project. Only this file and supabase-client.ts
// talk to Supabase; the demo build swaps it out (see src/data/backend.ts).
import type { Backend } from '@/data/api'
import { checkInRow, checkInTiming, clearsOnStatus, isRun, kindOf, pairWatch, WATCH_SPORT, watchSport } from '@/data/rules'
import { supabase } from '@/data/supabase-client'
import type { CheckIns, DayDot, DaySession, Video, WatchActivity } from '@/data/types'
import { now } from '@/lib/clock'
import { addDays, appDay, DAY_STARTS_AT } from '@/lib/dates'

const WATCH_COLUMNS = 'id, date, sport, duration_s, distance_m, hr_avg, load, elevation_m'
const PAGE = 1000 // Supabase returns at most this many rows per request

type Result<T> = { data: T | null; error: { message: string; code?: string } | null }

// Throws the error's message, so callers can show it. Lists come back as [] rather than null.
function check<T>(res: Result<T[]>): T[]
function check<T>(res: Result<T>): T | null
function check<T>(res: Result<T>) {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// Every row of a long list, a page at a time (a year of check-ins is over 1000 rows)
async function all<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const batch = check(await page(from, from + PAGE - 1))
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}

async function planSession(id: string) {
  const p = check(await supabase.from('plan_sessions').select('id, date, kind, run_step').eq('id', id).maybeSingle())
  if (!p) throw new Error('This session is no longer in the plan')
  return p
}

async function logId(planSessionId: string) {
  const log = check(await supabase.from('session_logs').select('id').eq('plan_session_id', planSessionId).maybeSingle())
  return log?.id ?? null
}

async function lastRunStep() {
  const data = check(
    await supabase
      .from('activities')
      .select('run_step')
      .eq('sport', 'run')
      .neq('source', 'intervals')
      .not('run_step', 'is', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
  )
  return data[0]?.run_step ?? 1
}

async function syncedAt() {
  const data = check(await supabase.from('sync_status').select('synced_at').eq('source', 'intervals').maybeSingle())
  return data?.synced_at ?? null
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
    const recorded = data.some((s) => watchSport(s.kind) && s.session_logs?.status !== 'skipped')
    const [videos, watchRows] = await Promise.all([
      ids.length
        ? supabase
            .from('videos')
            .select('*')
            .in('yt_id', ids)
            .then((r) => check(r))
        : ([] as Video[]),
      recorded
        ? supabase
            .from('activities')
            .select(WATCH_COLUMNS)
            .eq('source', 'intervals')
            .in('sport', Object.values(WATCH_SPORT))
            .eq('date', date)
            .order('created_at')
            .then((r) => check(r))
        : ([] as WatchActivity[]),
    ])
    const watch = pairWatch(
      data.map((s) => ({ kind: s.kind, status: s.session_logs?.status })),
      watchRows,
    )
    return data.map(
      ({ session_logs, activities, tests, ...s }, i): DaySession => ({
        ...s,
        kind: kindOf(s.kind),
        log: session_logs,
        activity: activities,
        watch: watch[i],
        tests,
        // keep the order the plan lists them in
        videos: s.video_ids.flatMap((id) => videos.filter((v) => v.yt_id === id)),
      }),
    )
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
      ;(byDay[s.date] ??= []).push({ id: s.id, slot: s.slot, kind: kindOf(s.kind), status: s.session_logs?.status ?? null })
    }
    return byDay
  },

  async checkIns(date) {
    const [answers, run, kg] = await Promise.all([
      supabase
        .from('symptoms')
        .select('body_area, timing, score')
        .eq('date', date)
        .in('timing', ['next_morning', 'evening'])
        .is('session_log_id', null)
        .then((r) => check(r)),
      supabase
        .from('activities')
        .select('id, plan_session_id, run_step, clean')
        .eq('date', addDays(date, -1))
        .eq('sport', 'run')
        .neq('source', 'intervals') // the run you logged, not its watch copy
        .limit(1)
        .then((r) => check(r)),
      supabase
        .from('weights')
        .select('kg')
        .eq('date', date)
        .maybeSingle()
        .then((r) => check(r)),
    ])
    const find = (area: string, timing: string) => answers.find((a) => a.body_area === area && a.timing === timing)?.score ?? null
    const r = run[0]
    const result: CheckIns = {
      arch: find('arch', 'next_morning'),
      neck: find('neck', 'evening'),
      hands: find('hands', 'evening'),
      weight: kg ? Number(kg.kg) : null,
      run: r ? { id: r.id, planSessionId: r.plan_session_id, step: r.run_step, clean: r.clean } : null,
    }
    return result
  },

  async runSteps() {
    return check(await supabase.from('run_steps').select('*').order('step'))
  },

  lastRunStep,

  async lastLog(before) {
    const start = new Date(`${before}T${String(DAY_STARTS_AT).padStart(2, '0')}:00:00`).toISOString()
    const [log, answer] = await Promise.all([
      supabase
        .from('session_logs')
        .select('logged_at')
        .lt('logged_at', start)
        .order('logged_at', { ascending: false })
        .limit(1)
        .then((r) => check(r)),
      supabase
        .from('symptoms')
        .select('created_at')
        .is('session_log_id', null)
        .lt('created_at', start)
        .order('created_at', { ascending: false })
        .limit(1)
        .then((r) => check(r)),
    ])
    const latest = [log[0]?.logged_at, answer[0]?.created_at]
      .filter((x): x is string => !!x)
      .sort()
      .pop()
    return latest ? { date: appDay(new Date(latest)) } : null
  },

  async progress(today) {
    const yearAgo = addDays(today, -364)
    const [symptoms, runs, watch, tests, weights, next, synced] = await Promise.all([
      // only the check-ins (one a day per area), in pages: trends need a whole year
      all((from, to) =>
        supabase
          .from('symptoms')
          .select('date, body_area, timing, score')
          .is('session_log_id', null)
          .in('timing', ['next_morning', 'evening'])
          .gte('date', yearAgo)
          .lte('date', today)
          .order('date')
          .order('id')
          .range(from, to),
      ),
      supabase
        .from('activities')
        .select('date, run_step, clean')
        .eq('sport', 'run')
        .neq('source', 'intervals')
        .lte('date', today)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
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
      supabase
        .from('tests')
        .select('date, test, side, value, unit')
        .lte('date', today)
        .order('date')
        .then((r) => check(r)),
      supabase
        .from('weights')
        .select('date, kg')
        .gte('date', yearAgo)
        .lte('date', today)
        .order('date')
        .then((r) => check(r)),
      supabase
        .from('plan_sessions')
        .select('date, run_step, title, kind, session_logs(status)')
        .ilike('kind', 'run')
        .gte('date', today)
        .order('date')
        .order('slot')
        .limit(4)
        .then((r) => check(r)),
      syncedAt(),
    ])
    const nextRun = next.find((p) => !p.session_logs) ?? null
    return {
      today,
      symptoms,
      runs,
      watch,
      tests,
      weights: weights.map((w) => ({ date: w.date, kg: Number(w.kg) })),
      nextRun: nextRun && { date: nextRun.date, run_step: nextRun.run_step, title: nextRun.title },
      syncedAt: synced,
    }
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

  async testResults(test) {
    return check(await supabase.from('tests').select('date, side, value, plan_session_id').eq('test', test).order('date'))
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

  syncedAt,

  async review(weekStart) {
    const data = check(
      await supabase
        .from('reviews')
        .select('id, week_start, summary, decisions, created_at')
        .lte('week_start', weekStart)
        .order('week_start', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1),
    )
    return data[0] ?? null
  },

  // The status of one session. Skipped (or cleared) removes pain during and test
  // results; a run that happened gets a run log, a run that didn't loses it.
  async setStatus(id, status) {
    const plan = await planSession(id)
    const clears = clearsOnStatus(status)
    if (status) {
      const log = check(
        await supabase
          .from('session_logs')
          .upsert({ plan_session_id: id, status, logged_at: now().toISOString() }, { onConflict: 'plan_session_id' })
          .select('id')
          .single(),
      )
      if (clears.pain && log) check(await supabase.from('symptoms').delete().eq('session_log_id', log.id).eq('timing', 'during'))
    } else {
      check(await supabase.from('session_logs').delete().eq('plan_session_id', id)) // pain goes with it (cascade)
    }
    if (clears.tests) check(await supabase.from('tests').delete().eq('plan_session_id', id))
    if (!isRun(plan.kind)) return
    if (clears.runLog) {
      check(await supabase.from('activities').delete().eq('plan_session_id', id).neq('source', 'intervals'))
      return
    }
    // The run log starts at the planned step, else the last logged run's (Pedro can change it)
    const step = plan.run_step ?? (await lastRunStep())
    check(
      await supabase
        .from('activities')
        .upsert(
          { plan_session_id: id, date: plan.date, sport: 'run', run_step: step, source: 'manual' },
          { onConflict: 'plan_session_id', ignoreDuplicates: true },
        ),
    )
  },

  // Pain during a session (one score per body area). null clears it.
  async setPain(id, area, score) {
    const [plan, log] = await Promise.all([planSession(id), logId(id)])
    if (!log) throw new Error('Log the session first')
    if (score == null) {
      check(await supabase.from('symptoms').delete().eq('session_log_id', log).eq('body_area', area.body_area).eq('timing', 'during'))
      return
    }
    check(
      await supabase
        .from('symptoms')
        .upsert(
          { session_log_id: log, date: plan.date, body_area: area.body_area, side: area.side, timing: 'during', score },
          { onConflict: 'session_log_id,body_area,timing' },
        ),
    )
  },

  async setRun(id, changes) {
    check(await supabase.from('activities').update(changes).eq('plan_session_id', id).neq('source', 'intervals'))
  },

  async setComment(id, comment) {
    check(await supabase.from('session_logs').update({ comment }).eq('plan_session_id', id))
  },

  // One test result per side (e.g. heel-raise reps). null clears it.
  async setTest(id, spec, side, value) {
    if (value == null) {
      check(await supabase.from('tests').delete().eq('plan_session_id', id).eq('test', spec.test).eq('side', side))
      return
    }
    const plan = await planSession(id)
    check(
      await supabase
        .from('tests')
        .upsert(
          { plan_session_id: id, date: plan.date, test: spec.test, side, value, unit: spec.unit },
          { onConflict: 'plan_session_id,test,side' },
        ),
    )
  },

  // Move a session to another day (and/or slot). Anything logged for it moves too.
  async moveSession(id, date, slot) {
    check(await supabase.from('plan_sessions').update({ date, slot }).eq('id', id))
    const log = await logId(id)
    await Promise.all([
      log &&
        supabase
          .from('symptoms')
          .update({ date })
          .eq('session_log_id', log)
          .then((r) => check(r)),
      supabase
        .from('activities')
        .update({ date })
        .eq('plan_session_id', id)
        .then((r) => check(r)),
      supabase
        .from('tests')
        .update({ date })
        .eq('plan_session_id', id)
        .then((r) => check(r)),
    ])
  },

  // One answer per day, area and timing. (Writes run one at a time, see store.ts, so
  // reading first can't race with another tap.)
  async saveCheckIn(date, area, score) {
    const match = () =>
      supabase
        .from('symptoms')
        .select('id')
        .eq('date', date)
        .eq('body_area', area)
        .eq('timing', checkInTiming(area))
        .is('session_log_id', null)
    if (score == null) {
      const rows = check(await match())
      if (rows.length)
        check(
          await supabase
            .from('symptoms')
            .delete()
            .in(
              'id',
              rows.map((r) => r.id),
            ),
        )
      return
    }
    const existing = check(await match().limit(1))[0]
    if (existing) check(await supabase.from('symptoms').update({ score }).eq('id', existing.id))
    else check(await supabase.from('symptoms').insert(checkInRow(date, area, score)))
  },

  async saveClean(runLogId, clean) {
    check(await supabase.from('activities').update({ clean }).eq('id', runLogId))
  },

  // One weight per day, so a new value corrects it; null removes it
  async saveWeight(date, kg) {
    if (kg == null) check(await supabase.from('weights').delete().eq('date', date))
    else check(await supabase.from('weights').upsert({ date, kg }, { onConflict: 'user_id,date' }))
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
