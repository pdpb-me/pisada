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
    return {
      verdict: 'none' as const,
      now: a.length ? average(a) : null,
      before: b.length ? average(b) : null,
      counts: [a.length, b.length],
    }
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
  better: 'Better than the week before',
  same: 'About the same as the week before',
  worse: 'Worse than the week before',
  none: 'Not enough answers to compare',
}

// The zones of the plan: ≤ 3 OK, 4–6 hold or back off, 7+ stop
export function zoneText(score: number) {
  return score <= 3 ? 'In the OK zone' : score <= 6 ? 'Hold or back off' : 'Stop zone'
}

export type AreaSummary = {
  series: { date: string; score: number | null }[] // 14 days, oldest first, today last
  answered: number // answers in the last 7 days
  typical: number | null // the last 7 days' average, rounded (null with fewer than 3 answers)
  latest: { date: string; score: number } | null // the latest answer in the last 7 days
  worst: number | null // the worse of typical and latest: the colour to show
  badDays: number // days with any pain / tingling in the last 7 days
  verdict: 'better' | 'same' | 'worse' | 'none' // last 7 days against the 7 before
}

// One area over the last 7 days (and the 7 before), for its card on Progress
export function areaSummary(symptoms: Symptom[], area: AreaId, today: string): AreaSummary {
  const series = dailySeries(symptoms, area, today, 14)
  const scores = series.map((d) => d.score)
  const week = series.slice(7).filter((d): d is { date: string; score: number } => d.score != null)
  const typical = week.length >= MIN_ANSWERS ? Math.round(average(week.map((d) => d.score))) : null
  const latest = week[week.length - 1] ?? null
  const worst = typical == null ? null : Math.max(typical, latest?.score ?? 0)
  return {
    series,
    answered: week.length,
    typical,
    latest,
    worst,
    badDays: week.filter((d) => d.score > 0).length,
    verdict: compare(scores.slice(7), scores.slice(0, 7)).verdict,
  }
}

// One sentence for the top of Progress: "Neck worse than the week before. Arch and hands about the same."
export function headline(verdicts: Record<AreaId, AreaSummary['verdict']>) {
  const names = { arch: 'Arch', neck: 'Neck', hands: 'Hands' }
  const group = (v: AreaSummary['verdict']) => (Object.keys(verdicts) as AreaId[]).filter((a) => verdicts[a] === v)
  const list = (ids: AreaId[]) => {
    const words = ids.map((a, i) => (i === 0 ? names[a] : names[a].toLowerCase()))
    return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]
  }
  const parts: string[] = []
  const worse = group('worse')
  const better = group('better')
  const same = group('same')
  if (worse.length) parts.push(`${list(worse)} worse than the week before.`)
  if (better.length) parts.push(`${list(better)} better.`)
  if (same.length) parts.push(`${list(same)} about the same.`)
  if (!parts.length) return 'Not enough check-ins yet to compare weeks.'
  return parts.join(' ')
}
