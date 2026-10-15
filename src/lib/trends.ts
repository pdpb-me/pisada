// How each tracked area is measured and summed up over time (Progress screen).
// One answer per day: arch in the morning (first steps), neck and hand tingling in the evening.
import { addDays } from '@/lib/dates'
import { painLabel } from '@/lib/pain'
import { tinglingLabel } from '@/lib/tingling'

export type AreaId = 'arch' | 'neck' | 'hands'

export const AREAS: Record<
  AreaId,
  { title: string; sub: string; body_area: string; timing: string; label: (score: number) => string; scale: 'pain' | 'tingling' }
> = {
  arch: { title: 'Arch', sub: 'First steps', body_area: 'arch', timing: 'next_morning', label: painLabel, scale: 'pain' },
  neck: { title: 'Neck', sub: 'Over the day', body_area: 'neck', timing: 'evening', label: painLabel, scale: 'pain' },
  hands: { title: 'Hands', sub: 'Tingling', body_area: 'hands', timing: 'evening', label: tinglingLabel, scale: 'tingling' },
}

export type Symptom = { date: string; body_area: string; timing: string; score: number }

// One value per day (the highest that day), null when not answered; oldest first, `to` last
export function dailySeries(symptoms: Symptom[], area: AreaId, to: string, days: number) {
  const a = AREAS[area]
  const byDay = new Map<string, number>()
  for (const s of symptoms) {
    if (s.body_area !== a.body_area || s.timing !== a.timing) continue
    byDay.set(s.date, Math.max(byDay.get(s.date) ?? 0, s.score))
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(to, i - days + 1)
    return { date, score: byDay.get(date) ?? null }
  })
}

const MIN_ANSWERS = 3 // per period, before comparing
const CHANGE = 1 // average points (0–10) that count as a real change

export const average = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length

// Compare the last `days` with the `days` before: better / same / worse, or not enough answers
export function compare(now: (number | null)[], before: (number | null)[]) {
  const a = now.filter((x): x is number => x != null)
  const b = before.filter((x): x is number => x != null)
  if (a.length < MIN_ANSWERS || b.length < MIN_ANSWERS)
    return { verdict: 'none' as const, now: a.length ? average(a) : null, before: b.length ? average(b) : null, counts: [a.length, b.length] }
  const n = average(a)
  const p = average(b)
  return {
    verdict: n <= p - CHANGE ? ('better' as const) : n >= p + CHANGE ? ('worse' as const) : ('same' as const),
    now: n,
    before: p,
    counts: [a.length, b.length],
  }
}

export const VERDICT_TEXT = {
  better: '↓ Better than last week',
  same: '→ Same as last week',
  worse: '↑ Worse than last week',
  none: 'Not enough answers yet',
}

// The zones of the plan: ≤ 3 OK, 4–6 hold or back off, 7+ stop
export function zoneText(avg: number) {
  return avg <= 3 ? 'In the OK zone' : avg <= 6 ? 'Hold or back off' : 'Stop zone'
}
