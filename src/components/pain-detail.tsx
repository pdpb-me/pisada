import { useState } from 'react'
import { DetailScreen, RangeTabs } from '@/components/detail-parts'
import { RANGES, type RangeId } from '@/lib/ranges'
import { FactorsList } from '@/components/factors-list'
import { areaFactors } from '@/lib/factors'
import { Card } from '@/components/ui/card'
import type { ProgressData } from '@/data/types'
import { addDays } from '@/lib/dates'
import { dayMonth, weekdayShort } from '@/lib/format'
import { painBand, PAIN_LEVELS } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { TINGLING_LEVELS } from '@/lib/tingling'
import { AREAS, areaSummary, average, compare, dailySeries, zoneText, type AreaId } from '@/lib/trends'
import { cn } from '@/lib/utils'

// Chart geometry (SVG units): plot from x 14 to 272, words on the right
const X0 = 14
const X1 = 272
// y for a 0–10 score: the plan's zones get equal room (None 210, Mild 150, Moderate 90, Unbearable 10)
const yPain = (s: number) => (s <= 2 ? 210 - s * 30 : s <= 5 ? 150 - (s - 2) * 20 : 90 - (s - 5) * 16)
const STROKE: Record<string, string> = { low: 'stroke-pain-low', mid: 'stroke-pain-mid', high: 'stroke-pain-high' }

const SUB: Record<AreaId, string> = {
  arch: 'Right arch, first steps in the morning',
  neck: 'Neck, over the whole day',
  hands: 'Hand tingling, over the whole day',
}

// One area over time: the last 7 days first (the state now), then the range's average and
// its trend, the daily chart on the plan's zones, and what goes with a bad day.
export function PainDetail({ area, data, onBack }: { area: AreaId; data: ProgressData; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<RangeId>('4w')
  const range = RANGES.find((r) => r.id === rangeId)!
  const a = AREAS[area]
  const tingling = a.scale === 'tingling'
  const week = areaSummary(data.symptoms, area, data.today)

  // The range starts at the first answer ever, if that's later (no empty months)
  const firstAnswer = dailySeries(data.symptoms, area, data.today, 364).find((d) => d.score != null)?.date
  const series = dailySeries(data.symptoms, area, data.today, range.days)
  const start = Math.max(
    0,
    series.findIndex((d) => d.date >= (firstAnswer ?? data.today)),
  )
  const shown = series.slice(start)
  const previous = dailySeries(data.symptoms, area, addDays(data.today, -range.days), range.days)
  const cmp = compare(
    series.map((d) => d.score),
    previous.map((d) => d.score),
  )
  const answered = shown.map((d, i) => ({ ...d, i })).filter((d): d is { date: string; score: number; i: number } => d.score != null)
  const avg = answered.length ? Math.round(average(answered.map((d) => d.score))) : null
  const n = Math.max(shown.length, 2)
  const x = (i: number) => X0 + (i * (X1 - X0)) / (n - 1)

  // Marks under the chart: what happened on each day (from the watch and the app)
  const bike = new Map<string, number>()
  const runDays = new Set(data.runs.map((r) => r.date))
  for (const w of data.watch) {
    if (w.sport === 'bike') bike.set(w.date, (bike.get(w.date) ?? 0) + (w.duration_s ?? 0) / 60)
    if (w.sport === 'run') runDays.add(w.date)
  }
  const handsOn = new Map(dailySeries(data.symptoms, 'hands', data.today, range.days).map((d) => [d.date, d.score]))
  const neckOn = new Map(dailySeries(data.symptoms, 'neck', data.today, range.days).map((d) => [d.date, d.score]))
  const marks =
    area === 'arch'
      ? [{ label: 'A run the day before', shape: 'square', on: (d: string) => runDays.has(addDays(d, -1)) }]
      : [
          { label: 'Bike over 60 min that day', shape: 'square', on: (d: string) => (bike.get(d) ?? 0) >= 60 },
          area === 'neck'
            ? { label: 'Hands tingled', shape: 'circle', on: (d: string) => (handsOn.get(d) ?? 0) > 0 }
            : { label: 'Neck Mild or worse', shape: 'circle', on: (d: string) => (neckOn.get(d) ?? 0) >= 2 },
        ]

  const levels = tingling
    ? TINGLING_LEVELS.map((l) => ({ y: yPain(l.score), text: l.label }))
    : PAIN_LEVELS.map((l) => ({ y: yPain(l.score), text: l.label }))
  const top = tingling ? yPain(5) : 10
  const ticks = [0, 0.5, 1].map((f) => Math.round(f * (n - 1)))
  const factors = areaFactors(area, data, range.days)
  const word = (s: number) => a.label(s)

  return (
    <DetailScreen title={a.title} sub={SUB[area]} onBack={onBack}>
      <Card className="gap-3 px-4 py-4">
        <span className="text-sm text-muted-foreground">Last 7 days</span>
        {week.typical != null ? (
          <>
            <span className="flex items-center gap-2">
              <span className={cn('size-3.5 rounded-full', PAIN_DOT[painBand(week.worst!)])} aria-hidden />
              <span className="text-hero font-semibold">{tingling ? `${week.badDays} of ${week.answered} days` : word(week.typical)}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {tingling ? 'with tingling' : 'usual'}
              {week.latest && ` · latest ${word(week.latest.score)} (${weekdayShort(week.latest.date)})`}
            </span>
            {!tingling && <span className="text-base font-semibold">{zoneText(week.worst!)}</span>}
          </>
        ) : (
          <span className="text-base font-semibold">Not enough answers yet ({week.answered} of 7 days)</span>
        )}
      </Card>

      <RangeTabs value={rangeId} onChange={setRangeId} />

      <Card className="gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Average, {start > 0 ? `since ${dayMonth(shown[0].date)}` : range.text}</span>
            <span className="flex items-center gap-2 text-xl font-semibold">
              {avg != null && <span className={cn('size-2.5 rounded-full', PAIN_DOT[painBand(avg)])} aria-hidden />}
              {avg != null ? word(avg) : '–'}
            </span>
          </div>
          <span className="max-w-40 text-right text-sm text-muted-foreground">
            {cmp.verdict === 'none'
              ? 'Not enough answers to compare'
              : `${cmp.verdict === 'better' ? 'Better than' : cmp.verdict === 'worse' ? 'Worse than' : 'About the same as'} ${range.before}`}
          </span>
        </div>

        <svg viewBox="0 0 350 235" className="w-full" role="img" aria-label={`${a.title} per day, ${range.text}`}>
          {!tingling && <rect x="0" y="10" width="4" height="80" className="fill-pain-high" />}
          <rect x="0" y="90" width="4" height="60" className="fill-pain-mid" />
          <rect x="0" y="150" width="4" height="60" className="fill-pain-low" />
          {levels.map((l) => (
            <g key={l.text}>
              <line x1="8" x2={X1 + 4} y1={l.y} y2={l.y} className="stroke-border" strokeDasharray={l.y === 210 ? undefined : '3 3'} />
              <text x={X1 + 8} y={l.y + 4} className="fill-muted-foreground text-[11px]">
                {l.text}
              </text>
            </g>
          ))}
          <polyline
            points={answered.map((d) => `${x(d.i).toFixed(1)},${yPain(d.score).toFixed(1)}`).join(' ')}
            fill="none"
            className="stroke-foreground/50"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {answered.map((d) => (
            <circle
              key={d.date}
              cx={x(d.i)}
              cy={yPain(d.score)}
              r={n > 35 ? 2.6 : 4.2}
              className={cn('fill-card', STROKE[painBand(d.score)])}
              strokeWidth="2"
            />
          ))}
          {ticks.map((i, k) => (
            <text
              key={k}
              x={x(i)}
              y="230"
              textAnchor={k === 0 ? 'start' : k === ticks.length - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[12px]"
            >
              {dayMonth(shown[i]?.date ?? data.today)}
            </text>
          ))}
          <line x1="8" x2="8" y1={top} y2="210" className="stroke-border" />
        </svg>

        {/* Same frame as the chart, so each mark sits under its day */}
        <div className="flex flex-col gap-1.5">
          {marks.map((m) => (
            <div key={m.label} className="flex flex-col">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('size-2 bg-foreground/70', m.shape === 'circle' ? 'rounded-full' : 'rounded-[2px]')} aria-hidden />
                {m.label}
              </span>
              <svg viewBox="0 0 350 12" className="w-full" aria-hidden>
                <line x1="8" x2={X1 + 4} y1="6" y2="6" className="stroke-border" />
                {shown.map((d, i) =>
                  m.on(d.date) ? (
                    m.shape === 'circle' ? (
                      <circle key={d.date} cx={x(i)} cy="6" r="3.5" className="fill-foreground/70" />
                    ) : (
                      <rect key={d.date} x={x(i) - 3.5} y="2.5" width="7" height="7" rx="1.5" className="fill-foreground/70" />
                    )
                  ) : null,
                )}
              </svg>
            </div>
          ))}
        </div>
      </Card>

      <Card className="gap-3 px-4 py-4">
        <h2 className="text-xl font-semibold">What goes with a bad day</h2>
        <p className="text-sm text-muted-foreground">
          {tingling ? 'Days the hands tingled' : `Days the ${area === 'arch' ? 'arch was' : 'neck was'} Mild or worse`},{' '}
          {start > 0 ? `since ${dayMonth(shown[0].date)}` : range.text}.
        </p>
        <FactorsList area={area} result={factors} />
      </Card>
    </DetailScreen>
  )
}
