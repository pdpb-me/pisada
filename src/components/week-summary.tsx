import type { DayDot } from '@/hooks/use-week'
import { useNextTest } from '@/hooks/use-next-test'

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000)
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Calm facts, not streaks: how the shown week is going, and where the heel-raise test stands.
export function WeekSummary({ dots, today }: { dots: Record<string, DayDot[]>; today: string }) {
  const { next, results } = useNextTest(today)

  const all = Object.values(dots).flat()
  const done = all.filter((d) => d.status === 'done').length
  const partial = all.filter((d) => d.status === 'partial').length

  // First and latest test, per side
  const dates = [...new Set(results.map((r) => r.date))]
  const at = (date: string | undefined, side: string) => results.find((r) => r.date === date && r.side === side)?.value
  const first = dates[0]
  const last = dates[dates.length - 1]
  const sideText = (side: 'L' | 'R') => {
    const a = at(first, side)
    const b = at(last, side)
    if (b == null) return null
    return first !== last && a != null ? `${side} ${a} → ${b}` : `${side} ${b}`
  }
  const resultText = [sideText('L'), sideText('R')].filter(Boolean).join(' · ')

  let testText: string | null = null
  if (next) {
    const n = daysBetween(today, next.date)
    testText = n === 0 ? 'Heel-raise test today' : n === 1 ? 'Heel-raise test tomorrow' : `Heel-raise test in ${n} days (${shortDate(next.date)})`
  }

  if (all.length === 0 && !testText && !resultText) return null
  return (
    <div className="flex flex-col gap-0.5 px-1 text-sm text-muted-foreground">
      {all.length > 0 && (
        <span>
          This week: <span className="font-medium text-foreground">{done} of {all.length} done</span>
          {partial > 0 && ` · ${partial} partly`}
        </span>
      )}
      {(testText || resultText) && (
        <span>
          {resultText && (
            <>
              {first !== last ? 'Heel raises: ' : 'Last heel-raise test: '}
              <span className="font-medium text-foreground">{resultText}</span>
              {testText && ' · '}
            </>
          )}
          {testText}
        </span>
      )}
    </div>
  )
}
