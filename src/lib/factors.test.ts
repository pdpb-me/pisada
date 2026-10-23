import { describe, expect, it } from 'vitest'
import { factorsFor, factorTests, lift, liftWord } from '@/lib/factors'
import { addDays } from '@/lib/dates'

// 14 evenings: long bike rides on the first 7 (neck Mild 5 times), short or none after (Mild once)
const days = Array.from({ length: 14 }, (_, i) => ({ date: addDays('2026-11-01', i), score: i < 7 ? (i < 5 ? 2 : 0) : i === 10 ? 2 : 0 }))
const watch = days.flatMap((d, i) => (i < 7 ? [{ date: d.date, sport: 'bike', duration_s: 70 * 60 }] : i % 2 ? [{ date: d.date, sport: 'bike', duration_s: 20 * 60 }] : []))

describe('what goes with a bad day', () => {
  it('counts bad days with and without each factor, strongest first', () => {
    const r = factorsFor('neck', days, factorTests('neck', watch, new Set(), () => false))
    expect(r.enough).toBe(true)
    expect(r.answered).toBe(14)
    const long = r.factors[0]
    expect(long.id).toBe('bike-long')
    expect(long.with).toEqual({ bad: 5, of: 7 })
    expect(long.without).toEqual({ bad: 1, of: 7 })
    expect(liftWord(long)).toBe('More often')
    expect(lift(long)).toBeCloseTo(4 / 7)
  })

  it('leaves out factors with too few days on one side, and says when there are too few answers', () => {
    const r = factorsFor('neck', days.slice(0, 6), factorTests('neck', watch, new Set(), () => false))
    expect(r.enough).toBe(false)
    expect(r.factors.find((f) => f.id === 'run')).toBeUndefined() // no runs at all
  })

  it('looks at the day before for the arch (a morning measure)', () => {
    const runs = new Set(['2026-11-03'])
    const tests = factorTests('arch', [], runs, () => false)
    expect(tests.find((t) => t.id === 'run-before')!.on('2026-11-04')).toBe(true)
    expect(tests.find((t) => t.id === 'run-before')!.on('2026-11-03')).toBe(false)
  })
})
