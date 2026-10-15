import { useState } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Progress } from '@/hooks/use-progress'
import { addDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { averageKg, changeText, weightChange } from '@/lib/weight'

const RANGES = [
  { id: '4W', days: 28, text: 'last 4 weeks', before: 'the 4 weeks before' },
  { id: '3M', days: 91, text: 'last 3 months', before: 'the 3 months before' },
  { id: '6M', days: 182, text: 'last 6 months', before: 'the 6 months before' },
] as const

const X0 = 10
const X1 = 300

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
}

// Weight over time: each entry as a dot, plus the weekly average as a line (the real trend).
export function WeightDetail({ data, onBack }: { data: Progress; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('4W')
  const range = RANGES.find((r) => r.id === rangeId)!
  const from = addDays(data.today, -(range.days - 1))
  const entries = data.weights.filter((w) => w.date >= from && w.date <= data.today)
  const { now, change } = weightChange(data.weights, data.today, range.days)
  const last = data.weights[data.weights.length - 1]

  // Weekly averages (7-day blocks ending today), drawn at the middle of each block
  const weeks = Array.from({ length: Math.ceil(range.days / 7) }, (_, k) => {
    const end = addDays(data.today, -7 * k)
    const avg = averageKg(data.weights, addDays(end, -6), end)
    return avg ? { date: addDays(end, -3), kg: avg.kg } : null
  })
    .filter((w): w is { date: string; kg: number } => w != null && w.date >= from)
    .reverse()

  const all = entries.map((e) => e.kg)
  const lo = Math.floor(Math.min(...all, Infinity) - 0.5)
  const hi = Math.ceil(Math.max(...all, -Infinity) + 0.5)
  const y = (kg: number) => 200 - ((kg - lo) / Math.max(hi - lo, 1)) * 180
  const x = (date: string) =>
    X0 + ((Date.parse(`${date}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000 / (range.days - 1)) * (X1 - X0)
  const gridKg = entries.length ? [lo, (lo + hi) / 2, hi] : []

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col bg-card pb-8">
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Back to Progress" onClick={onBack}>
          <ChevronLeftIcon className="size-6" />
        </Button>
        <span className="text-sm font-semibold tracking-wider text-muted-foreground">PROGRESS</span>
      </div>

      <div className="px-4 pb-3">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full border p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === rangeId}
              onClick={() => setRangeId(r.id)}
              className={cn(
                'h-10 rounded-full text-base',
                r.id === rangeId ? 'bg-primary font-semibold text-primary-foreground' : 'font-medium text-muted-foreground',
              )}
            >
              {r.id.replace(/(\d)/, '$1 ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Weight</h1>
          <span className="text-sm text-muted-foreground">Mornings, after peeing, before drinking or eating</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[28px] leading-tight font-bold">{now ? `${now.kg.toFixed(1)} kg` : '–'}</span>
            <span className="text-sm text-muted-foreground">
              Average, {range.text}
              {now ? ` (${now.n} ${now.n === 1 ? 'entry' : 'entries'})` : ''}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[28px] leading-tight font-bold">{last ? `${last.kg.toFixed(1)}` : '–'}</span>
            <span className="text-sm text-muted-foreground">{last ? `Last, ${shortDate(last.date)}` : 'No entries yet'}</span>
          </div>
        </div>

        <span className="text-xl font-bold">{changeText(change, range.before)}</span>

        <div className="flex flex-col gap-2">
          <span className="text-[17px] font-bold">
            {shortDate(from)} – {shortDate(data.today)}
          </span>
          {entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No weight entries in this range. Add one in the morning check-in on Today.
            </p>
          ) : (
            <svg viewBox="0 0 350 225" className="w-full" role="img" aria-label={`Weight, ${range.text}`}>
              {gridKg.map((kg) => (
                <g key={kg}>
                  <line x1={X0 - 4} x2={X1 + 4} y1={y(kg)} y2={y(kg)} className="stroke-border" strokeDasharray="3 3" />
                  <text x={X1 + 10} y={y(kg) + 4} className="fill-muted-foreground text-[12px]">
                    {kg % 1 === 0 ? kg : kg.toFixed(1)}
                  </text>
                </g>
              ))}
              {weeks.length >= 2 && (
                <polyline
                  points={weeks.map((w) => `${x(w.date).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ')}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              )}
              {entries.map((e) => (
                <circle key={e.date} cx={x(e.date)} cy={y(e.kg)} r={range.days > 28 ? 2.4 : 4} className="fill-primary/35" />
              ))}
              {[0, 0.5, 1].map((f) => {
                const d = addDays(from, Math.round(f * (range.days - 1)))
                return (
                  <text key={f} x={x(d)} y="220" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[12px]">
                    {shortDate(d)}
                  </text>
                )
              })}
            </svg>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary/35" />
              Each entry
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-primary" />
              Weekly average
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
