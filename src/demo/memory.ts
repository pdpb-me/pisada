// The demo backend: the same reads and writes as src/data/supabase.ts, on an in-memory
// database (src/demo/db.ts). Same rules too: one log per session, one check-in answer
// per day, a skipped session loses its pain and test results, a run that happened gets
// a run log. No network.
import type { Backend } from '@/data/api'
import type { DayDot, DaySession, Evening, EveningArea, WatchActivity } from '@/data/types'
import type { Db } from '@/demo/db'
import { DEMO_USER } from '@/demo/db'
import { addDays } from '@/lib/dates'
import { now } from '@/lib/clock'

const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
const byDate = (a: { date: string }, b: { date: string }) => -byDateDesc(a, b)

let counter = 0
export function newId() {
  counter++
  return `demo-${Date.now().toString(36)}-${counter.toString(36)}`
}

const stamp = () => now().toISOString()

function watchOf(a: Db['activities'][number]): WatchActivity {
  const { id, date, sport, duration_s, distance_m, hr_avg, load, elevation_m } = a
  return { id, date, sport, duration_s, distance_m, hr_avg, load, elevation_m }
}

export function createMemoryBackend(db: () => Db, options: { latencyMs?: () => number } = {}): Backend {
  // A pause like a real network's, so loading states can be seen (?latency=600)
  const wait = () => new Promise<void>((r) => setTimeout(r, options.latencyMs?.() ?? 0))

  const lastRunStep = async () => {
    const runs = db()
      .activities.filter((a) => a.sport === 'run' && a.run_step != null)
      .sort((a, b) => byDateDesc(a, b) || (a.created_at < b.created_at ? 1 : -1))
    return runs[0]?.run_step ?? 1
  }

  const morning = async (date: string) => {
    const d = db()
    const arch = d.symptoms.find((s) => s.date === date && s.body_area === 'arch' && s.timing === 'next_morning')
    const run = d.activities.find((a) => a.date === addDays(date, -1) && a.sport === 'run' && a.source !== 'intervals')
    const w = d.weights.find((x) => x.date === date)
    return {
      arch: arch ? { id: arch.id, score: arch.score } : null,
      run: run ? { id: run.id, clean: run.clean } : null,
      weight: w ? Number(w.kg) : null,
    }
  }

  const evening = async (date: string) => {
    const answers: Evening = {}
    for (const s of db().symptoms)
      if (s.date === date && s.timing === 'evening' && s.session_log_id == null && (s.body_area === 'neck' || s.body_area === 'hands'))
        answers[s.body_area as EveningArea] = { id: s.id, score: s.score }
    return answers
  }

  const removeLog = (planSessionId: string) => {
    const d = db()
    const log = d.session_logs.find((l) => l.plan_session_id === planSessionId)
    if (!log) return
    d.session_logs = d.session_logs.filter((l) => l !== log)
    d.symptoms = d.symptoms.filter((s) => s.session_log_id !== log.id) // on delete cascade
  }

  const backend: Backend = {
    auth: {
      signedIn: async () => true,
      onChange: () => () => {},
      sendCode: async () => {},
      verify: async () => {},
      signOut: async () => {},
    },

    async day(date) {
      await wait()
      const d = db()
      const plan = d.plan_sessions
        .filter((p) => p.date === date)
        .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.created_at < b.created_at ? -1 : 1))
      const runs = d.activities
        .filter((a) => a.source === 'intervals' && a.sport === 'run' && a.date === date)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      let nextRun = 0
      return plan.map((p): DaySession => {
        const log = d.session_logs.find((l) => l.plan_session_id === p.id) ?? null
        return {
          ...p,
          log: log && { ...log, symptoms: d.symptoms.filter((s) => s.session_log_id === log.id) },
          activity: d.activities.find((a) => a.plan_session_id === p.id) ?? null,
          watch: p.kind === 'run' && runs[nextRun] ? watchOf(runs[nextRun++]) : null,
          tests: d.tests.filter((t) => t.plan_session_id === p.id),
          videos: p.video_ids.flatMap((id) => d.videos.filter((v) => v.yt_id === id)),
        }
      })
    },

    async weekDots(from, to) {
      await wait()
      const d = db()
      const byDay: Record<string, DayDot[]> = {}
      const plan = d.plan_sessions
        .filter((p) => p.date >= from && p.date <= to)
        .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.created_at < b.created_at ? -1 : 1))
      for (const p of plan) {
        const log = d.session_logs.find((l) => l.plan_session_id === p.id)
        ;(byDay[p.date] ??= []).push({ id: p.id, slot: p.slot, kind: p.kind, status: log?.status ?? null })
      }
      return byDay
    },

    async runSteps() {
      await wait()
      return [...db().run_steps].sort((a, b) => a.step - b.step)
    },

    lastRunStep,

    async morning(date) {
      await wait()
      return morning(date)
    },

    async evening(date) {
      await wait()
      return evening(date)
    },

    async progress(today) {
      await wait()
      const d = db()
      const yearAgo = addDays(today, -364)
      return {
        today,
        symptoms: d.symptoms
          .filter((s) => s.date >= yearAgo && s.date <= today)
          .map(({ date, body_area, timing, score }) => ({ date, body_area, timing, score })),
        runs: d.activities
          .filter((a) => a.sport === 'run' && a.source !== 'intervals' && a.date <= today)
          .sort(byDateDesc)
          .slice(0, 30)
          .map(({ date, run_step, clean }) => ({ date, run_step, clean })),
        watch: d.activities
          .filter((a) => a.source === 'intervals' && a.date >= addDays(today, -182) && a.date <= today)
          .sort(byDateDesc)
          .map(watchOf),
        tests: d.tests
          .filter((t) => t.date <= today)
          .sort(byDate)
          .map(({ date, test, side, value, unit }) => ({ date, test, side, value, unit })),
        weights: d.weights
          .filter((w) => w.date >= yearAgo && w.date <= today)
          .sort(byDate)
          .map((w) => ({ date: w.date, kg: Number(w.kg) })),
      }
    },

    async nextTest(today) {
      await wait()
      const next = db()
        .plan_sessions.filter((p) => p.exercises.includes('sl_heel_raise_test') && p.date >= today)
        .sort(byDate)[0]
      return next ? { date: next.date } : null
    },

    async watch(from, to) {
      await wait()
      return db()
        .activities.filter((a) => a.source === 'intervals' && a.date >= from && a.date <= to)
        .sort(byDateDesc)
        .map(watchOf)
    },

    async oldestWatchDate() {
      await wait()
      return db().activities.filter((a) => a.source === 'intervals').sort(byDate)[0]?.date ?? null
    },

    async syncedAt() {
      await wait()
      return db().sync_status.find((s) => s.source === 'intervals')?.synced_at ?? null
    },

    async review(weekStart) {
      await wait()
      const r = db()
        .reviews.filter((x) => x.week_start <= weekStart)
        .sort((a, b) => (a.week_start < b.week_start ? 1 : -1))[0]
      return r ? { id: r.id, week_start: r.week_start, summary: r.summary, decisions: r.decisions, created_at: r.created_at } : null
    },

    async setStatus(session, status) {
      await wait()
      const d = db()
      if (status) {
        const log = d.session_logs.find((l) => l.plan_session_id === session.id)
        if (log) Object.assign(log, { status, logged_at: stamp() })
        else
          d.session_logs.push({
            id: newId(),
            plan_session_id: session.id,
            status,
            comment: null,
            logged_at: stamp(),
            user_id: DEMO_USER,
          })
      } else removeLog(session.id)
      if (status === 'skipped' && session.log) d.symptoms = d.symptoms.filter((s) => s.session_log_id !== session.log!.id)
      if (status === 'skipped' || status === null) d.tests = d.tests.filter((t) => t.plan_session_id !== session.id)
      if (session.kind !== 'run') return
      const ran = status === 'done' || status === 'partial'
      const existing = d.activities.find((a) => a.plan_session_id === session.id)
      if (ran && !existing) {
        d.activities.push({
          id: newId(),
          plan_session_id: session.id,
          date: session.date,
          sport: 'run',
          run_step: session.run_step ?? (await lastRunStep()),
          source: 'manual',
          clean: null,
          created_at: stamp(),
          distance_m: null,
          duration_s: null,
          elevation_m: null,
          external_id: null,
          hr_avg: null,
          load: null,
          notes: null,
          raw: null,
          user_id: DEMO_USER,
        })
      } else if (!ran && existing) d.activities = d.activities.filter((a) => a !== existing)
    },

    async setPain(session, area, score) {
      await wait()
      const d = db()
      const log = d.session_logs.find((l) => l.plan_session_id === session.id)
      if (!log) return
      const existing = d.symptoms.find((s) => s.session_log_id === log.id && s.body_area === area.body_area && s.timing === 'during')
      if (score == null) d.symptoms = d.symptoms.filter((s) => s !== existing)
      else if (existing) existing.score = score
      else
        d.symptoms.push({
          id: newId(),
          session_log_id: log.id,
          date: session.date,
          body_area: area.body_area,
          side: area.side,
          timing: 'during',
          score,
          context: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async setRun(activityId, changes) {
      await wait()
      const a = db().activities.find((x) => x.id === activityId)
      if (a) Object.assign(a, changes)
    },

    async setComment(planSessionId, comment) {
      await wait()
      const log = db().session_logs.find((l) => l.plan_session_id === planSessionId)
      if (log) log.comment = comment
    },

    async setTest(session, spec, side, value) {
      await wait()
      const d = db()
      const existing = d.tests.find((t) => t.plan_session_id === session.id && t.test === spec.test && t.side === side)
      if (value == null) d.tests = d.tests.filter((t) => t !== existing)
      else if (existing) existing.value = value
      else
        d.tests.push({
          id: newId(),
          plan_session_id: session.id,
          date: session.date,
          test: spec.test,
          side,
          value,
          unit: spec.unit,
          notes: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async moveSession(session, date, slot) {
      await wait()
      const d = db()
      const p = d.plan_sessions.find((x) => x.id === session.id)
      if (!p) throw new Error('This session no longer exists')
      Object.assign(p, { date, slot })
      const log = d.session_logs.find((l) => l.plan_session_id === session.id)
      for (const s of d.symptoms) if (log && s.session_log_id === log.id) s.date = date
      for (const a of d.activities) if (a.plan_session_id === session.id) a.date = date
      for (const t of d.tests) if (t.plan_session_id === session.id) t.date = date
    },

    async saveArch(date, score) {
      await wait()
      const d = db()
      const existing = d.symptoms.find((s) => s.date === date && s.body_area === 'arch' && s.timing === 'next_morning')
      if (score == null) d.symptoms = d.symptoms.filter((s) => s !== existing)
      else if (existing) existing.score = score
      else
        d.symptoms.push({
          id: newId(),
          date,
          body_area: 'arch',
          side: 'R',
          timing: 'next_morning',
          score,
          context: 'morning check-in',
          session_log_id: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async saveClean(activityId, clean) {
      await wait()
      const a = db().activities.find((x) => x.id === activityId)
      if (a) a.clean = clean
    },

    async saveWeight(date, kg) {
      await wait()
      const d = db()
      const existing = d.weights.find((w) => w.date === date)
      if (kg == null) d.weights = d.weights.filter((w) => w !== existing)
      else if (existing) existing.kg = kg
      else d.weights.push({ id: newId(), date, kg, created_at: stamp(), user_id: DEMO_USER })
    },

    async saveEvening(date, area, score) {
      await wait()
      const d = db()
      const existing = d.symptoms.find((s) => s.date === date && s.body_area === area && s.timing === 'evening' && s.session_log_id == null)
      if (score == null) d.symptoms = d.symptoms.filter((s) => s !== existing)
      else if (existing) existing.score = score
      else
        d.symptoms.push({
          id: newId(),
          date,
          body_area: area,
          side: 'C',
          timing: 'evening',
          score,
          context: area === 'hands' ? 'tingling' : 'evening check-in',
          session_log_id: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async syncNow() {
      await wait()
      const d = db()
      const at = stamp()
      const row = d.sync_status.find((s) => s.source === 'intervals')
      if (row) Object.assign(row, { synced_at: at, via: 'app', count: 0 })
      else d.sync_status.push({ source: 'intervals', synced_at: at, via: 'app', count: 0, user_id: DEMO_USER })
      return { count: 0, synced_at: at }
    },
  }
  return backend
}
