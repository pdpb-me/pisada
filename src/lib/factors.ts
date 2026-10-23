// "What goes with a bad day": for each thing that may make an area worse (a long bike
// day, a run, …), how often the area was bad on days with it and on days without it.
// Plain counts, no statistics: with a few weeks of answers that's the honest level.
import { addDays } from '@/lib/dates'
import type { AreaId } from '@/lib/trends'

export type DayScore = { date: string; score: number | null }
export type WatchDay = { date: string; sport: string; duration_s: number | null }

export type Factor = {
  id: string
  label: string // 'Bike over 60 min'
  with: { bad: number; of: number } // days with the factor: how many were bad, of how many answered
  without: { bad: number; of: number }
}

export type FactorResult = {
  bad: string // what a bad day means here: 'Mild or worse'
  answered: number // days with an answer in the range
  factors: Factor[] // strongest link first; only factors with enough days on both sides
  enough: boolean // enough answered days to show anything at all
}

export const MIN_DAYS = 4 // per side (with / without), before a factor is shown
export const MIN_ANSWERED = 10 // answered days in the range, before anything is shown

type Test = { id: string; label: string; on: (date: string) => boolean }

// What each area is checked against. The arch is measured in the morning, so it looks
// at the day before; neck and hands are measured over the day itself.
export function factorTests(area: AreaId, watch: WatchDay[], runDates: Set<string>, neckBad: (d: string) => boolean): Test[] {
  const minutes = new Map<string, Record<string, number>>()
  for (const w of watch) {
    const day = (minutes.get(w.date) ?? {}) as Record<string, number>
    day[w.sport] = (day[w.sport] ?? 0) + (w.duration_s ?? 0) / 60
    minutes.set(w.date, day)
  }
  const sport = (d: string, s: string) => minutes.get(d)?.[s] ?? 0
  const ran = (d: string) => runDates.has(d) || sport(d, 'run') > 0
  if (area === 'arch') {
    const before = (d: string) => addDays(d, -1)
    return [
      { id: 'run-before', label: 'A run the day before', on: (d) => ran(before(d)) },
      { id: 'hike-before', label: 'A hike the day before', on: (d) => sport(before(d), 'hike') > 0 },
      { id: 'strength-before', label: 'Strength the day before', on: (d) => sport(before(d), 'strength') > 0 },
    ]
  }
  const tests: Test[] = [
    { id: 'bike-long', label: 'Bike over 60 min', on: (d) => sport(d, 'bike') >= 60 },
    { id: 'bike', label: 'Any bike ride', on: (d) => sport(d, 'bike') > 0 },
    { id: 'run', label: 'A run', on: ran },
    { id: 'strength', label: 'A strength session', on: (d) => sport(d, 'strength') > 0 },
  ]
  if (area === 'hands') tests.push({ id: 'neck', label: 'Neck Mild or worse', on: neckBad })
  return tests
}

export function badDayRule(area: AreaId) {
  return area === 'hands'
    ? { word: 'tingled', test: (s: number) => s > 0 }
    : { word: 'Mild or worse', test: (s: number) => s >= 2 }
}

export function factorsFor(area: AreaId, days: DayScore[], tests: Test[]): FactorResult {
  const rule = badDayRule(area)
  const answered = days.filter((d): d is { date: string; score: number } => d.score != null)
  const count = (xs: typeof answered) => ({ bad: xs.filter((d) => rule.test(d.score)).length, of: xs.length })
  const factors = tests
    .map((t) => ({
      id: t.id,
      label: t.label,
      with: count(answered.filter((d) => t.on(d.date))),
      without: count(answered.filter((d) => !t.on(d.date))),
    }))
    .filter((f) => f.with.of >= MIN_DAYS && f.without.of >= MIN_DAYS)
    .sort((a, b) => lift(b) - lift(a))
  return { bad: rule.word, answered: answered.length, factors, enough: answered.length >= MIN_ANSWERED }
}

// How much more often a bad day comes with the factor than without it (-1 … 1)
export function lift(f: Factor) {
  return f.with.bad / f.with.of - f.without.bad / f.without.of
}

// In words, calm and honest: 'More often' only for a clear gap
export function liftWord(f: Factor) {
  const l = lift(f)
  return l >= 0.25 ? 'More often' : l <= -0.25 ? 'Less often' : 'About the same'
}
