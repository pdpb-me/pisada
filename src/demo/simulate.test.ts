import { describe, expect, it } from 'vitest'
import { buildWorld, snapshot } from '@/demo/simulate'
import { SCENARIOS } from '@/demo/scenarios'

describe('the 12-week simulation', () => {
  const world = buildWorld()

  it('is the same every time (seeded)', () => {
    expect(JSON.stringify(buildWorld())).toBe(JSON.stringify(world))
  })

  it('has one log per session, and every log belongs to a planned session', () => {
    const ids = new Set(world.plan_sessions.map((p) => p.id))
    const logged = world.session_logs.map((l) => l.plan_session_id)
    expect(new Set(logged).size).toBe(logged.length)
    expect(logged.every((id) => ids.has(id))).toBe(true)
  })

  it('has one check-in answer per day, area and timing', () => {
    const keys = world.symptoms.filter((s) => !s.session_log_id).map((s) => `${s.date}|${s.body_area}|${s.timing}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('stores pain as the app does (0, 2, 5, 8, 10) and tingling as 0, 2, 5', () => {
    for (const s of world.symptoms) {
      expect([0, 2, 5, 8, 10]).toContain(s.score)
      if (s.body_area === 'hands') expect([0, 2, 5]).toContain(s.score)
    }
  })

  it('plans every run with a ladder step that exists', () => {
    const steps = new Set(world.run_steps.map((s) => s.step))
    for (const p of world.plan_sessions.filter((x) => x.kind === 'run')) expect(steps.has(p.run_step!)).toBe(true)
  })

  it('gives each logged run one run log', () => {
    const runs = world.activities.filter((a) => a.source === 'manual')
    expect(new Set(runs.map((a) => a.plan_session_id)).size).toBe(runs.length)
  })

  it('shows nothing written after the moment of a snapshot', () => {
    const s = SCENARIOS.find((x) => x.id === 'late')!
    const db = snapshot(world, new Date(s.at))
    const t = new Date(s.at).toISOString()
    expect(db.session_logs.every((l) => l.logged_at <= t)).toBe(true)
    expect(db.plan_sessions.every((p) => p.created_at <= t)).toBe(true)
  })
})
