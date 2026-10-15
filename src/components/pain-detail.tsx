import { useState } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Progress } from '@/hooks/use-progress'
import { addDays } from '@/lib/dates'
import { painBand } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { AREAS, compare, dailySeries, zoneText, type AreaId } from '@/lib/trends'
import { cn } from '@/lib/utils'

const RANGES = [
  { id: '4W', days: 28, text: 'last 4 weeks' },
  { id: '3M', days: 91, text: 'last 3 months' },
  { id: '6M', days: 182, text: 'last 6 months' },
] as const

// Chart geometry (SVG units): plot from x 14 to 306, values on the right
const X0 = 14
const X1 = 306
// y for a 0–10 score: None 210, Mild 150, Moderate 90, Worst 10 (the plan's zones get equal room)
const yPain = (s: number) => (s <= 2 ? 210 - s * 30 : s <= 5 ? 150 - (s - 2) * 20 : 90 - (s - 5) * 16)

const STROKE: Record<string, string> = { low: 'stroke-pain-low', mid: 'stroke-pain-mid', high: 'stroke-pain-high' }

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
}

// One area over time, in the style of Suunto's VO2max screen: the average word,
// a zone bar with a marker, then the daily chart on its zones.
export function PainDetail({ area, data, onBack }: { area: AreaId; data: Progress; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('4W')
  const range = RANGES.find((r) => r.id === rangeId)!
  const a = AREAS[area]
  const tingling = a.scale === 'tingling'

  const series = dailySeries(data.symptoms, area, data.today, range.days)
  const previous = dailySeries(data.symptoms, area, addDays(data.today, -range.days), range.days)
  const cmp = compare(
    series.map((d) => d.score),
    previous.map((d) => d.score),
  )
  // rounded once, so the word, the dot, the zone and the marker always agree
  const avg = cmp.now == null ? null : Math.round(cmp.now)
  const x = (i: number) => X0 + (i * (X1 - X0)) / (range.days - 1)
  const answered = series.map((d, i) => ({ ...d, i })).filter((d): d is { date: string; score: number; i: number } => d.score != null)

  // Days with a long bike ride / a run, from the watch (and runs logged in the app)
  const bikeMinutes = new Map<string, number>()
  const runDays = new Set(data.runs.map((r) => r.date))
  for (const w of data.watch) {
    if (w.sport === 'bike') bikeMinutes.set(w.date, (bikeMinutes.get(w.date) ?? 0) + (w.duration_s ?? 0) / 60)
    if (w.sport === 'run') runDays.add(w.date)
  }
  const longBike = (date: string) => (bikeMinutes.get(date) ?? 0) >= 30
  const handsOn = new Map(dailySeries(data.symptoms, 'hands', data.today, range.days).map((d) => [d.date, d.score]))
  const neckOn = new Map(dailySeries(data.symptoms, 'neck', data.today, range.days).map((d) => [d.date, d.score]))

  const marks =
    area === 'arch'
      ? [{ label: 'Run day before', color: 'fill-primary', on: (d: string) => runDays.has(addDays(d, -1)) }]
      : [
          { label: 'Bike 30+ min', color: 'fill-primary', on: longBike },
          area === 'neck'
            ? { label: 'Hands tingled', color: 'fill-violet-500', on: (d: string) => (handsOn.get(d) ?? 0) > 0 }
            : { label: 'Neck Moderate+', color: 'fill-pain-mid', on: (d: string) => (neckOn.get(d) ?? 0) >= 5 },
        ]

  // What goes with a bad day: share of bad days with and without each factor
  const bad = (s: number) => (tingling ? s > 0 : s >= 5)
  const badWord = tingling ? 'tingled' : 'Moderate or worse'
  const share = (filter: (date: string) => boolean) => {
    const days = answered.filter((d) => filter(d.date))
    return { n: days.filter((d) => bad(d.score)).length, of: days.length }
  }
  const factors =
    area === 'arch'
      ? [
          { label: 'Morning after a run', ...share((d) => runDays.has(addDays(d, -1))) },
          { label: 'Other mornings', ...share((d) => !runDays.has(addDays(d, -1))) },
        ]
      : [
          { label: 'Days with a bike ride over 30 min', ...share(longBike) },
          { label: 'Days without one', ...share((d) => !longBike(d)) },
          area === 'neck'
            ? { label: 'Days the hands tingled', ...share((d) => (handsOn.get(d) ?? 0) > 0) }
            : { label: 'Days the neck was Moderate+', ...share((d) => (neckOn.get(d) ?? 0) >= 5) },
        ]

  const levels = tingling
    ? [
        { y: 210, text: 'None' },
        { y: 150, text: 'A bit' },
        { y: 90, text: 'A lot' },
      ]
    : [
        { y: 210, text: 'None' },
        { y: 150, text: 'Mild' },
        { y: 90, text: 'Mod.' },
        { y: 10, text: 'Worst' },
      ]
  const top = tingling ? 90 : 10
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (range.days - 1)))

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
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">{a.title}</h1>
          <span className="text-sm text-muted-foreground">
            {area === 'arch' ? 'Right arch, first steps in the morning' : area === 'neck' ? 'Neck, over the whole day' : 'Hand tingling, over the whole day'}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[28px] leading-tight font-bold">
              {avg != null && <span className={cn('size-3 rounded-full', PAIN_DOT[painBand(avg)])} />}
              {avg != null ? a.label(avg) : '–'}
            </span>
            <span className="text-sm text-muted-foreground">Average, {range.text}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[28px] leading-tight font-bold">
              {cmp.verdict === 'better' ? '↓' : cmp.verdict === 'worse' ? '↑' : cmp.verdict === 'same' ? '→' : '–'}
            </span>
            <span className="text-sm text-muted-foreground">
              {cmp.verdict === 'none'
                ? 'Not enough to compare'
                : `${cmp.verdict === 'better' ? 'Better than' : cmp.verdict === 'worse' ? 'Worse than' : 'Same as'} the ${range.text.replace('last ', '')} before`}
            </span>
          </div>
        </div>

        {/* Zone bar with a marker at the average */}
        <div className="flex flex-col gap-2.5">
          {avg != null && !tingling && <span className="text-xl font-bold">{zoneText(avg)}</span>}
          <div className="relative h-3.5">
            <div className="mt-0.5 flex h-2.5 gap-[3px]">
              <span className="flex-[3] rounded-l-full bg-pain-low" />
              <span className={cn('flex-[3] bg-pain-mid', tingling && 'rounded-r-full')} />
              {!tingling && <span className="flex-[4] rounded-r-full bg-pain-high" />}
            </div>
            {avg != null && (
              <span
                className="absolute -top-[3px] h-5 w-1 rounded-full bg-foreground ring-2 ring-card"
                style={{ left: `calc(${Math.min(100, (avg / (tingling ? 6 : 10)) * 100)}% - 2px)` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[13px] text-muted-foreground">
            {(tingling ? ['None', 'A bit', 'A lot'] : ['None', 'Mild', 'Moderate', 'Severe', 'Worst']).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>

        {/* Daily chart on its zones */}
        <div className="flex flex-col gap-2">
          <span className="text-[17px] font-bold">
            {shortDate(series[0].date)} – {shortDate(series[series.length - 1].date)}
          </span>
          <svg viewBox="0 0 350 245" className="w-full" role="img" aria-label={`${a.title} per day, ${range.text}`}>
            {!tingling && <rect x="0" y="10" width="5" height="80" className="fill-pain-high" />}
            <rect x="0" y="90" width="5" height="60" className="fill-pain-mid" />
            <rect x="0" y="150" width="5" height="60" className="fill-pain-low" />
            {avg != null && (
              <rect
                x="8"
                width={X1 - 2}
                y={painBand(avg) === 'high' ? 10 : painBand(avg) === 'mid' ? 90 : 150}
                height={painBand(avg) === 'high' ? 80 : 60}
                className={cn(PAIN_DOT[painBand(avg)].replace('bg-', 'fill-'), 'opacity-15')}
              />
            )}
            {levels.map((l) => (
              <g key={l.text}>
                <line x1="8" x2={X1 + 4} y1={l.y} y2={l.y} className="stroke-border" strokeDasharray={l.y === 210 ? undefined : '3 3'} />
                <text x={X1 + 10} y={l.y + 4} className="fill-muted-foreground text-[12px]">
                  {l.text}
                </text>
              </g>
            ))}
            <polyline
              points={answered.map((d) => `${x(d.i).toFixed(1)},${yPain(d.score).toFixed(1)}`).join(' ')}
              fill="none"
              className="stroke-foreground/60"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {answered.map((d) => (
              <circle
                key={d.date}
                cx={x(d.i)}
                cy={yPain(d.score)}
                r={range.days > 28 ? 2.6 : 4.5}
                className={cn('fill-card', STROKE[painBand(d.score)])}
                strokeWidth="2"
              />
            ))}
            {ticks.map((i) => (
              <text key={i} x={x(i)} y="232" textAnchor="middle" className="fill-muted-foreground text-[12px]">
                {shortDate(series[i].date)}
              </text>
            ))}
            <line x1="8" x2="8" y1={top} y2="210" className="stroke-border" />
          </svg>
          {/* Same 350-wide frame as the chart, so each mark sits under its day */}
          <div className="flex flex-col gap-2">
            {marks.map((m) => (
              <div key={m.label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <svg viewBox="0 0 350 10" className="w-full" aria-hidden>
                  <line x1="8" x2={X1 + 4} y1="5" y2="5" className="stroke-border" />
                  {series.map((d, i) =>
                    m.on(d.date) ? <rect key={d.date} x={x(i) - 3} y="1" width="6" height="8" rx="2" className={m.color} /> : null,
                  )}
                </svg>
              </div>
            ))}
          </div>
        </div>

        <section className="flex flex-col gap-3 border-t pt-5">
          <h2 className="text-[22px] font-bold">What goes with a bad day</h2>
          {answered.length < 14 ? (
            <p className="text-sm text-muted-foreground">
              Shown once there are 2 weeks of answers ({answered.length} so far in this range). Then it compares days with
              and without each factor.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Share of days that were {badWord}, {range.text}. A pattern to discuss with your coach, not a diagnosis.
              </p>
              {factors.map((f) => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-[15px]">
                    <span>{f.label}</span>
                    <span className="font-semibold whitespace-nowrap">{f.of ? `${f.n} of ${f.of} days` : 'no days yet'}</span>
                  </div>
                  <div className="flex h-2 rounded-full bg-muted">
                    <span className="rounded-full bg-pain-mid" style={{ width: `${f.of ? Math.round((f.n / f.of) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
