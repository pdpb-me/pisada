// Contract tests for the Backend: the rules both implementations must follow (see
// src/data/rules.ts and the migrations). They run on the demo's memory backend; the same
// tests can run against a local Supabase later (supabase start).
import { beforeEach, describe, expect, it } from 'vitest'
import type { Backend } from '@/data/api'
import { emptyDb, type Db } from '@/demo/db'
import { createMemoryBackend } from '@/demo/memory'
import { buildWorld, snapshot } from '@/demo/simulate'

let db: Db
let api: Backend
const plan = (id: string, kind: string, date = '2026-11-19', extra: Partial<Db['plan_sessions'][number]> = {}) =>
  db.plan_sessions.push({
    id,
    date,
    slot: 'pm',
    kind,
    title: kind,
    instructions: null,
    exercises: kind === 'test' ? ['sl_heel_raise_test'] : [],
    video_ids: [],
    run_step: kind === 'run' ? 3 : null,
    block: null,
    created_at: '2026-11-15T17:00:00Z',
    user_id: 'u',
    ...extra,
  })
const arch = { body_area: 'arch', side: 'R' }
const heel = { test: 'sl_heel_raise', unit: 'reps' }

beforeEach(() => {
  db = emptyDb()
  api = createMemoryBackend(() => db)
  plan('run', 'run')
  plan('test', 'test')
  plan('neck', 'neck')
})

describe('session status', () => {
  it('gives a run that happened one run log at the planned step, whatever the taps', async () => {
    await api.setStatus('run', 'done')
    await api.setStatus('run', 'partial')
    await api.setStatus('run', 'done')
    const logs = db.activities.filter((a) => a.plan_session_id === 'run')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ run_step: 3, source: 'manual', sport: 'run', date: '2026-11-19' })
  })

  it('works from the database, not a copy: done then skipped leaves no run log', async () => {
    await api.setStatus('run', 'done')
    await api.setStatus('run', 'skipped')
    expect(db.activities).toHaveLength(0)
  })

  it('skipped clears pain during and test results, and keeps the log and its note', async () => {
    await api.setStatus('test', 'done')
    await api.setPain('test', arch, 2)
    await api.setTest('test', heel, 'L', 20)
    await api.setComment('test', 'left first')
    await api.setStatus('test', 'skipped')
    expect(db.symptoms).toHaveLength(0)
    expect(db.tests).toHaveLength(0)
    expect(db.session_logs[0]).toMatchObject({ status: 'skipped', comment: 'left first' })
  })

  it('clearing the log removes everything tied to it', async () => {
    await api.setStatus('run', 'done')
    await api.setPain('run', arch, 5)
    await api.setStatus('run', null)
    expect(db.session_logs).toHaveLength(0)
    expect(db.symptoms).toHaveLength(0)
    expect(db.activities).toHaveLength(0)
  })

  it('a kind written with a capital still counts as a run', async () => {
    plan('Run2', 'Run')
    await api.setStatus('Run2', 'done')
    expect(db.activities.filter((a) => a.plan_session_id === 'Run2')).toHaveLength(1)
  })

  it('pain needs a log first', async () => {
    await expect(api.setPain('neck', arch, 2)).rejects.toThrow()
  })
})

describe('moving a session', () => {
  it('takes pain, the run log and test results to the new date', async () => {
    await api.setStatus('run', 'done')
    await api.setPain('run', arch, 2)
    await api.moveSession('run', '2026-11-21', 'am')
    expect(db.plan_sessions.find((p) => p.id === 'run')).toMatchObject({ date: '2026-11-21', slot: 'am' })
    expect(db.symptoms[0].date).toBe('2026-11-21')
    expect(db.activities[0].date).toBe('2026-11-21')
  })
})

describe('check-ins', () => {
  it('keep one answer per day and area; a new tap corrects it; null removes it', async () => {
    await api.saveCheckIn('2026-11-19', 'arch', 2)
    await api.saveCheckIn('2026-11-19', 'arch', 5)
    await api.saveCheckIn('2026-11-19', 'neck', 0)
    expect(await api.checkIns('2026-11-19')).toMatchObject({ arch: 5, neck: 0, hands: null })
    expect(db.symptoms).toHaveLength(2)
    expect(db.symptoms.find((s) => s.body_area === 'arch')).toMatchObject({
      side: 'R',
      timing: 'next_morning',
      context: 'morning check-in',
    })
    await api.saveCheckIn('2026-11-19', 'arch', null)
    expect((await api.checkIns('2026-11-19')).arch).toBeNull()
  })

  it('refuse what the database refuses', async () => {
    await expect(api.saveCheckIn('2026-11-19', 'arch', 11)).rejects.toThrow()
    await expect(api.saveWeight('2026-11-19', 12)).rejects.toThrow()
    await expect(api.moveSession('run', '2026-11-20', 'noon')).rejects.toThrow()
  })
})

describe('watch data on sessions', () => {
  it('pairs the watch run with the run that happened, not a skipped one', async () => {
    plan('run2', 'run', '2026-11-19', { slot: 'am', created_at: '2026-11-15T16:00:00Z' })
    db.activities.push({
      id: 'w1',
      date: '2026-11-19',
      sport: 'run',
      source: 'intervals',
      duration_s: 1800,
      distance_m: 4500,
      hr_avg: 145,
      created_at: '2026-11-19T19:00:00Z',
      clean: null,
      elevation_m: null,
      external_id: 'x',
      load: 30,
      notes: null,
      plan_session_id: null,
      raw: null,
      run_step: null,
      user_id: 'u',
    })
    await api.setStatus('run2', 'skipped') // the morning run (listed first) was skipped
    await api.setStatus('run', 'done')
    const day = await api.day('2026-11-19')
    expect(day.find((s) => s.id === 'run2')!.watch).toBeNull()
    expect(day.find((s) => s.id === 'run')!.watch).toMatchObject({ id: 'w1', distance_m: 4500 })
  })
})

describe('the simulated weeks', () => {
  it('pass the database limits', () => {
    const world = snapshot(buildWorld(), new Date('2026-11-23T00:00:00Z'))
    for (const s of world.symptoms) expect(s.score >= 0 && s.score <= 10).toBe(true)
    for (const w of world.weights) expect(w.kg >= 30 && w.kg <= 250).toBe(true)
    for (const p of world.plan_sessions) expect(['am', 'pm']).toContain(p.slot)
  })
})
