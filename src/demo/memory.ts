// The demo backend: the same reads and writes as src/data/supabase.ts, on an in-memory
// database (src/demo/db.ts). It follows the same rules (src/data/rules.ts) and checks
// the same limits as the database (supabase/migrations). No network.
import type { Backend } from '@/data/api'
import { check, checkInRow, checkInTiming, clearsOnStatus, isRun, kindOf, LIMITS, pairWatch, WATCH_SPORT } from '@/data/rules'
import type { CheckIns, DayDot, DaySession, WatchActivity } from '@/data/types'
import type { Db } from '@/demo/db'
import { DEMO_USER } from '@/demo/db'
import { now } from '@/lib/clock'
import { addDays, appDay, DAY_STARTS_AT } from '@/lib/dates'

const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
const byDate = (a: { date: string }, b: { date: string }) => -byDateDesc(a, b)
const bySlot = (a: { slot: string; created_at: string }, b: { slot: string; created_at: string }) =>
  a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.created_at < b.created_at ? -1 : 1

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

const blankActivity = {
  clean: null,
  distance_m: null,
  duration_s: null,
  elevation_m: null,
  external_id: null,
  hr_avg: null,
  load: null,
  notes: null,
  raw: null,
  run_step: null,
}

export function createMemoryBackend(db: () => Db, options: { latencyMs?: () => number } = {}): Backend {
  // A pause like a real network's, so loading states can be seen (?latency=600)
  const wait = () => new Promise<void>((r) => setTimeout(r, options.latencyMs?.() ?? 0))

  const plan = (id: string) => {
    const p = db().plan_sessions.find((x) => x.id === id)
    if (!p) throw new Error('This session is no longer in the plan')
    return p
  }
  const logOf = (id: string) => db().session_logs.find((l) => l.plan_session_id === id)
  const runLogOf = (id: string) => db().activities.find((a) => a.plan_session_id === id && a.source !== 'intervals')

  const lastRunStep = async () => {
    const runs = db()
      .activities.filter((a) => a.sport === 'run' && a.source !== 'intervals' && a.run_step != null)
      .sort((a, b) => byDateDesc(a, b) || (a.created_at < b.created_at ? 1 : -1))
    return runs[0]?.run_step ?? 1
  }

  const syncedAt = async () => db().sync_status.find((s) => s.source === 'intervals')?.synced_at ?? null

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
      const sessions = d.plan_sessions.filter((p) => p.date === date).sort(bySlot)
      const recorded = d.activities
        .filter((a) => a.source === 'intervals' && Object.values(WATCH_SPORT).includes(a.sport) && a.date === date)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
        .map(watchOf)
      const logs = sessions.map((p) => d.session_logs.find((l) => l.plan_session_id === p.id) ?? null)
      const watch = pairWatch(
        sessions.map((p, i) => ({ kind: p.kind, status: logs[i]?.status })),
        recorded,
      )
      return sessions.map((p, i): DaySession => {
        const log = logs[i]
        return {
          ...structuredClone(p),
          kind: kindOf(p.kind),
          log: log && { ...log, symptoms: d.symptoms.filter((s) => s.session_log_id === log.id) },
          activity: d.activities.find((a) => a.plan_session_id === p.id && a.source !== 'intervals') ?? null,
          watch: watch[i],
          tests: d.tests.filter((t) => t.plan_session_id === p.id),
          videos: p.video_ids.flatMap((id) => d.videos.filter((v) => v.yt_id === id)),
        }
      })
    },

    async weekDots(from, to) {
      await wait()
      const d = db()
      const byDay: Record<string, DayDot[]> = {}
      for (const p of d.plan_sessions.filter((x) => x.date >= from && x.date <= to).sort(bySlot)) {
        ;(byDay[p.date] ??= []).push({ id: p.id, slot: p.slot, kind: kindOf(p.kind), status: logOf(p.id)?.status ?? null })
      }
      return byDay
    },

    async checkIns(date) {
      await wait()
      const d = db()
      const find = (area: string, timing: string) =>
        d.symptoms.find((s) => s.date === date && s.body_area === area && s.timing === timing && !s.session_log_id)?.score ?? null
      const run = d.activities.find((a) => a.date === addDays(date, -1) && a.sport === 'run' && a.source !== 'intervals')
      const w = d.weights.find((x) => x.date === date)
      const result: CheckIns = {
        arch: find('arch', 'next_morning'),
        neck: find('neck', 'evening'),
        hands: find('hands', 'evening'),
        weight: w ? Number(w.kg) : null,
        run: run ? { id: run.id, planSessionId: run.plan_session_id, step: run.run_step, clean: run.clean } : null,
      }
      return result
    },

    async runSteps() {
      await wait()
      return [...db().run_steps].sort((a, b) => a.step - b.step)
    },

    async lastRunStep() {
      await wait()
      return lastRunStep()
    },

    async lastLog(before) {
      await wait()
      const d = db()
      const start = new Date(`${before}T${String(DAY_STARTS_AT).padStart(2, '0')}:00:00`).toISOString()
      const latest = [...d.session_logs.map((l) => l.logged_at), ...d.symptoms.filter((s) => !s.session_log_id).map((s) => s.created_at)]
        .filter((t) => t < start)
        .sort()
        .pop()
      return latest ? { date: appDay(new Date(latest)) } : null
    },

    async progress(today) {
      await wait()
      const d = db()
      const yearAgo = addDays(today, -364)
      const next = d.plan_sessions
        .filter((p) => isRun(p.kind) && p.date >= today && !logOf(p.id))
        .sort((a, b) => byDate(a, b) || bySlot(a, b))[0]
      return {
        today,
        symptoms: d.symptoms
          .filter(
            (s) => !s.session_log_id && (s.timing === 'next_morning' || s.timing === 'evening') && s.date >= yearAgo && s.date <= today,
          )
          .sort(byDate)
          .map(({ date, body_area, timing, score }) => ({ date, body_area, timing, score })),
        runs: d.activities
          .filter((a) => a.sport === 'run' && a.source !== 'intervals' && a.date <= today)
          .sort((a, b) => byDateDesc(a, b) || (a.created_at < b.created_at ? 1 : -1))
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
        nextRun: next ? { date: next.date, run_step: next.run_step, title: next.title } : null,
        syncedAt: await syncedAt(),
      }
    },

    async nextTest(today) {
      await wait()
      const next = db()
        .plan_sessions.filter((p) => p.exercises.includes('sl_heel_raise_test') && p.date >= today)
        .sort(byDate)[0]
      return next ? { date: next.date } : null
    },

    async testResults(test) {
      await wait()
      return db()
        .tests.filter((t) => t.test === test)
        .sort(byDate)
        .map(({ date, side, value, plan_session_id }) => ({ date, side, value, plan_session_id }))
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
      return (
        db()
          .activities.filter((a) => a.source === 'intervals')
          .sort(byDate)[0]?.date ?? null
      )
    },

    async syncedAt() {
      await wait()
      return syncedAt()
    },

    async review(weekStart) {
      await wait()
      const r = db()
        .reviews.filter((x) => x.week_start <= weekStart)
        .sort((a, b) => (a.week_start < b.week_start ? 1 : a.week_start > b.week_start ? -1 : a.created_at < b.created_at ? 1 : -1))[0]
      return r ? { id: r.id, week_start: r.week_start, summary: r.summary, decisions: r.decisions, created_at: r.created_at } : null
    },

    async setStatus(id, status) {
      await wait()
      if (status) check(LIMITS.status(status), 'status')
      const d = db()
      const p = plan(id)
      const clears = clearsOnStatus(status)
      let log = logOf(id)
      if (status) {
        if (log) Object.assign(log, { status, logged_at: stamp() })
        else {
          log = { id: newId(), plan_session_id: id, status, comment: null, logged_at: stamp(), user_id: DEMO_USER }
          d.session_logs.push(log)
        }
        const logId = log.id
        if (clears.pain) d.symptoms = d.symptoms.filter((s) => !(s.session_log_id === logId && s.timing === 'during'))
      } else if (log) {
        const logId = log.id
        d.session_logs = d.session_logs.filter((l) => l.id !== logId)
        d.symptoms = d.symptoms.filter((s) => s.session_log_id !== logId) // on delete cascade
      }
      if (clears.tests) d.tests = d.tests.filter((t) => t.plan_session_id !== id)
      if (!isRun(p.kind)) return
      const existing = runLogOf(id)
      if (clears.runLog) {
        if (existing) d.activities = d.activities.filter((a) => a !== existing)
        return
      }
      if (!existing)
        d.activities.push({
          ...blankActivity,
          id: newId(),
          plan_session_id: id,
          date: p.date,
          sport: 'run',
          run_step: p.run_step ?? (await lastRunStep()),
          source: 'manual',
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async setPain(id, area, score) {
      await wait()
      if (score != null) check(LIMITS.score(score), 'pain score')
      const d = db()
      const p = plan(id)
      const log = logOf(id)
      if (!log) throw new Error('Log the session first')
      const existing = d.symptoms.find((s) => s.session_log_id === log.id && s.body_area === area.body_area && s.timing === 'during')
      if (score == null) d.symptoms = d.symptoms.filter((s) => s !== existing)
      else if (existing) existing.score = score
      else
        d.symptoms.push({
          id: newId(),
          session_log_id: log.id,
          date: p.date,
          body_area: area.body_area,
          side: area.side,
          timing: 'during',
          score,
          context: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async setRun(id, changes) {
      await wait()
      if (changes.run_step != null) check(LIMITS.step(changes.run_step), 'ladder step')
      const a = runLogOf(id)
      if (a) Object.assign(a, changes)
    },

    async setComment(id, comment) {
      await wait()
      const log = logOf(id)
      if (log) log.comment = comment
    },

    async setTest(id, spec, side, value) {
      await wait()
      const d = db()
      const existing = d.tests.find((t) => t.plan_session_id === id && t.test === spec.test && t.side === side)
      if (value == null) {
        d.tests = d.tests.filter((t) => t !== existing)
        return
      }
      const p = plan(id)
      if (existing) existing.value = value
      else
        d.tests.push({
          id: newId(),
          plan_session_id: id,
          date: p.date,
          test: spec.test,
          side,
          value,
          unit: spec.unit,
          notes: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async moveSession(id, date, slot) {
      await wait()
      check(LIMITS.slot(slot), 'slot')
      const d = db()
      const p = d.plan_sessions.find((x) => x.id === id)
      if (!p) return // like an update that matches no row
      Object.assign(p, { date, slot })
      const log = logOf(id)
      for (const s of d.symptoms) if (log && s.session_log_id === log.id) s.date = date
      for (const a of d.activities) if (a.plan_session_id === id) a.date = date
      for (const t of d.tests) if (t.plan_session_id === id) t.date = date
    },

    async saveCheckIn(date, area, score) {
      await wait()
      if (score != null) check(LIMITS.score(score), 'score')
      const d = db()
      const timing = checkInTiming(area)
      const match = (s: Db['symptoms'][number]) => s.date === date && s.body_area === area && s.timing === timing && !s.session_log_id
      if (score == null) {
        d.symptoms = d.symptoms.filter((s) => !match(s))
        return
      }
      const existing = d.symptoms.find(match)
      if (existing) existing.score = score
      else d.symptoms.push({ ...checkInRow(date, area, score), id: newId(), session_log_id: null, created_at: stamp(), user_id: DEMO_USER })
    },

    async saveClean(runLogId, clean) {
      await wait()
      const a = db().activities.find((x) => x.id === runLogId)
      if (a) a.clean = clean
    },

    async saveWeight(date, kg) {
      await wait()
      if (kg != null) check(LIMITS.kg(kg), 'weight')
      const d = db()
      const existing = d.weights.find((w) => w.date === date)
      if (kg == null) d.weights = d.weights.filter((w) => w !== existing)
      else if (existing) existing.kg = kg
      else d.weights.push({ id: newId(), date, kg, created_at: stamp(), user_id: DEMO_USER })
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
