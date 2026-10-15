// Weight goes up and down with water and food, so compare averages, not single days.
import { addDays } from '@/lib/dates'

export type Weight = { date: string; kg: number }

const MIN_ENTRIES = 2 // per period, before comparing

// Average of the entries between from and to (inclusive), or null
export function averageKg(weights: Weight[], from: string, to: string) {
  const xs = weights.filter((w) => w.date >= from && w.date <= to).map((w) => w.kg)
  return xs.length ? { kg: xs.reduce((t, x) => t + x, 0) / xs.length, n: xs.length } : null
}

// The last `days` against the `days` before: the change in kg, if both have enough entries
export function weightChange(weights: Weight[], today: string, days: number) {
  const now = averageKg(weights, addDays(today, -(days - 1)), today)
  const before = averageKg(weights, addDays(today, -(2 * days - 1)), addDays(today, -days))
  const change = now && before && now.n >= MIN_ENTRIES && before.n >= MIN_ENTRIES ? now.kg - before.kg : null
  return { now, before, change }
}

export function changeText(change: number | null, period: string) {
  if (change == null) return 'Not enough entries to compare'
  if (Math.abs(change) < 0.2) return `→ About the same as ${period}`
  return `${change < 0 ? '↓' : '↑'} ${Math.abs(change).toFixed(1)} kg vs ${period}`
}
