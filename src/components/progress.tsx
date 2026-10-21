import { useEffect, useState } from 'react'
import { FlagIcon, ScaleIcon, TrendingUpIcon } from 'lucide-react'
import { ActivitiesList } from '@/components/activities-list'
import { LadderDrawer } from '@/components/run-ladder'
import { PainDetail } from '@/components/pain-detail'
import { WeightDetail } from '@/components/weight-detail'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNextTest } from '@/hooks/use-next-test'
import { useProgress, type Progress as Data } from '@/hooks/use-progress'
import { useRunSteps } from '@/hooks/use-run-steps'
import { useScreens } from '@/hooks/use-screens'
import { useWeek } from '@/hooks/use-week'
import { addDays, weekOf } from '@/lib/dates'
import { painBand } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { AREAS, average, compare, dailySeries, VERDICT_TEXT, type AreaId } from '@/lib/trends'
import { cn } from '@/lib/utils'
import { changeText, weightChange } from '@/lib/weight'

type Screen = { kind: 'dashboard' } | { kind: 'pain'; area: AreaId } | { kind: 'weight' }

const STATUS_BLOCK: Record<string, string> = {
  done: 'bg-status-done',
  partial: 'bg-status-partial',
  skipped: 'bg-status-skipped',
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000)
}

// Dashboard (cards) | Activities (watch data); a pain card opens its detail.
export function Progress({ onDeepChange }: { onDeepChange: (deep: boolean) => void }) {
  return <ProgressView data={useProgress()} onDeepChange={onDeepChange} />
}

// Drawing only, so it can also be shown with sample data
export function ProgressView({ data, onDeepChange }: { data: Data | undefined; onDeepChange: (deep: boolean) => void }) {
  const nav = useScreens<Screen>({ kind: 'dashboard' })
  const [tab, setTab] = useState<'dashboard' | 'activities'>('dashboard')
  const deep = nav.screen.kind !== 'dashboard'

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  if (nav.screen.kind === 'pain' && data) {
    return <PainDetail area={nav.screen.area} data={data} onBack={nav.back} />
  }
  if (nav.screen.kind === 'weight' && data) {
    return <WeightDetail data={data} onBack={nav.back} />
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <div className="flex flex-col gap-3.5 border-b bg-card px-5 pt-5">
        <h1 className="text-[28px] font-bold tracking-tight">Progress</h1>
        <div className="flex gap-7" role="tablist">
          {(['dashboard', 'activities'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'min-h-11 border-b-[3px] pb-2 text-[17px] capitalize',
                tab === t ? 'border-primary font-semibold text-primary' : 'border-transparent font-medium text-muted-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {data === undefined ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-36 rounded-[18px]" />
          <Skeleton className="h-52 rounded-[18px]" />
        </div>
      ) : tab === 'activities' ? (
        <ActivitiesList watch={data.watch} today={data.today} />
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <WeekCard today={data.today} />
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(AREAS) as AreaId[]).map((a) => (
              <PainCard key={a} area={a} data={data} onOpen={() => nav.push({ kind: 'pain', area: a })} />
            ))}
            <WeightCard data={data} onOpen={() => nav.push({ kind: 'weight' })} />
            <HeelRaiseCard data={data} />
            <LadderCard runs={data.runs} />
          </div>
        </div>
      )}
    </main>
  )
}

// This week: one small block per planned session, coloured by status
function WeekCard({ today }: { today: string }) {
  const days = weekOf(today)
  const { dots } = useWeek(days)
  const all = Object.values(dots).flat()
  const done = all.filter((d) => d.status === 'done' || d.status === 'partial').length
  const partial = all.filter((d) => d.status === 'partial').length
  const skipped = all.filter((d) => d.status === 'skipped').length

  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[17px] font-semibold">This week</span>
        <span className="text-sm text-muted-foreground">
          {shortDate(days[0])} – {shortDate(days[6])}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[34px] leading-none font-bold tracking-tight">{done}</span>
            <span className="text-[17px] text-muted-foreground">of {all.length} sessions</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {[partial > 0 && `${partial} partly`, skipped > 0 && `${skipped} skipped`].filter(Boolean).join(' · ') || ' '}
          </span>
        </div>
        <div className="flex items-end gap-1.5" aria-hidden>
          {days.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <div className="flex h-11 flex-col-reverse gap-0.5">
                {(dots[d] ?? []).slice(0, 3).map((s) => (
                  <span
                    key={s.id}
                    className={cn('h-3.5 w-3.5 rounded-[3px]', s.status ? STATUS_BLOCK[s.status] : 'ring-[1.5px] ring-border ring-inset')}
                  />
                ))}
              </div>
              <span className={cn('text-[11px]', d === today ? 'font-bold' : 'text-muted-foreground')}>
                {new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// One area: the word for the last 7 days, the trend, and 14 small daily bars
function PainCard({ area, data, onOpen }: { area: AreaId; data: Data; onOpen: () => void }) {
  const a = AREAS[area]
  const days = dailySeries(data.symptoms, area, data.today, 14)
  const scores = days.map((d) => d.score)
  const cmp = compare(scores.slice(7), scores.slice(0, 7))
  const week = scores.slice(7).filter((s): s is number => s != null)
  const avg = week.length ? Math.round(average(week)) : null // rounded: word and dot agree

  const word =
    area === 'hands'
      ? week.length
        ? `${week.filter((s) => s > 0).length} ${week.filter((s) => s > 0).length === 1 ? 'day' : 'days'}`
        : '–'
      : avg != null
        ? a.label(avg)
        : '–'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-52 flex-col gap-2 rounded-[18px] bg-card p-3.5 text-left ring-1 ring-foreground/10"
    >
      <span className="flex items-start justify-between gap-1">
        <span className="flex flex-col">
          <span className="text-base font-semibold">{a.title}</span>
          <span className="text-xs text-muted-foreground">{a.sub} · 2 wk</span>
        </span>
        {avg != null && <span className={cn('mt-1 size-2.5 rounded-full', PAIN_DOT[painBand(avg)])} />}
      </span>
      <span className="text-[26px] leading-tight font-bold tracking-tight">{word}</span>
      <span className="text-xs font-medium text-muted-foreground">{VERDICT_TEXT[cmp.verdict]}</span>
      <span className="mt-auto flex h-11 items-end gap-0.5" aria-hidden>
        {scores.map((s, i) => (
          <span
            key={days[i].date}
            className={cn('flex-1 rounded-[2px]', s == null ? 'h-1.5 ring-1 ring-border ring-inset' : PAIN_DOT[painBand(s)])}
            style={s == null ? undefined : { height: `${s === 0 ? 6 : Math.round(8 + s * 3.4)}px` }}
          />
        ))}
      </span>
      <span className="flex justify-between text-[10px] text-muted-foreground">
        <span>2 wk ago</span>
        <span>today</span>
      </span>
    </button>
  )
}

function HeelRaiseCard({ data }: { data: Data }) {
  const { next } = useNextTest(data.today)
  const heel = data.tests.filter((t) => t.test === 'sl_heel_raise')
  const dates = [...new Set(heel.map((t) => t.date))]
  const first = dates[0]
  const last = dates[dates.length - 1]
  const at = (date: string | undefined, side: string) => heel.find((t) => t.date === date && t.side === side)?.value
  const countdown = next
    ? daysBetween(data.today, next.date) === 0
      ? 'Test today'
      : `Next test in ${daysBetween(data.today, next.date)} days`
    : null

  return (
    <Card className="min-h-44 gap-2 px-3.5 py-3.5">
      <div className="flex items-start justify-between">
        <span className="flex flex-col">
          <span className="text-base font-semibold">Heel raises</span>
          <span className="text-xs text-muted-foreground">Reps per side</span>
        </span>
        <FlagIcon className="size-4 text-primary" />
      </div>
      {last ? (
        <div className="flex gap-4">
          {(['L', 'R'] as const).map((side) => (
            <span key={side} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{side === 'L' ? 'Left' : 'Right'}</span>
              <span className="text-[28px] leading-tight font-bold">{at(last, side) ?? '–'}</span>
              {first !== last && at(first, side) != null && (
                <span className="text-xs text-muted-foreground">from {at(first, side)}</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[26px] leading-tight font-bold">–</span>
      )}
      <span className="mt-auto text-xs text-muted-foreground">
        {[last && `Last ${shortDate(last)}`, countdown].filter(Boolean).join(' · ') || 'No test planned'}
      </span>
    </Card>
  )
}

// Run–walk ladder: the current step (the coach moves it), and the clean streak.
// Tap: every step of the ladder.
function LadderCard({ runs }: { runs: Data['runs'] }) {
  const steps = useRunSteps()
  const [open, setOpen] = useState(false)
  const current = runs.find((r) => r.run_step != null)?.run_step ?? 1
  let streak = 0
  for (const r of runs) {
    if (r.clean !== true) break
    streak++
  }
  const total = Math.max(steps.length, current)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-44 flex-col gap-2 rounded-[18px] bg-card p-3.5 text-left ring-1 ring-foreground/10"
      >
        <span className="flex items-start justify-between">
          <span className="flex flex-col">
            <span className="text-base font-semibold">Run ladder</span>
            <span className="text-xs text-muted-foreground">Run–walk</span>
          </span>
          <TrendingUpIcon className="size-4 text-primary" />
        </span>
        <span className="flex items-baseline gap-1">
          <span className="text-[28px] leading-tight font-bold">Step {current}</span>
          {total > 0 && <span className="text-sm text-muted-foreground">of {total}</span>}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {runs.length === 0 ? 'No runs logged yet' : `${streak} clean ${streak === 1 ? 'run' : 'runs'} in a row`}
        </span>
        <span className="mt-auto flex w-full gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-full', i < current ? 'bg-primary' : 'bg-muted')} />
          ))}
        </span>
      </button>
      <LadderDrawer open={open} onOpenChange={setOpen} steps={steps} current={current} />
    </>
  )
}

// Weight: the latest value, the 7-day average and its change, and a small 4-week line
function WeightCard({ data, onOpen }: { data: Data; onOpen: () => void }) {
  const last = data.weights[data.weights.length - 1]
  const { now, change } = weightChange(data.weights, data.today, 7)
  const recent = data.weights.filter((w) => w.date > addDays(data.today, -28))
  const lo = Math.min(...recent.map((w) => w.kg))
  const hi = Math.max(...recent.map((w) => w.kg))
  const span = Math.max(hi - lo, 0.5)
  const dayX = (d: string) => (daysBetween(addDays(data.today, -27), d) / 27) * 100

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-52 flex-col gap-2 rounded-[18px] bg-card p-3.5 text-left ring-1 ring-foreground/10"
    >
      <span className="flex items-start justify-between gap-1">
        <span className="flex flex-col">
          <span className="text-base font-semibold">Weight</span>
          <span className="text-xs text-muted-foreground">{last ? `Last ${shortDate(last.date)}` : 'Morning check-in'}</span>
        </span>
        <ScaleIcon className="size-4 text-primary" />
      </span>
      <span className="text-[26px] leading-tight font-bold tracking-tight">{last ? `${last.kg.toFixed(1)} kg` : '–'}</span>
      <span className="text-xs font-medium text-muted-foreground">
        {now ? `7-day avg ${now.kg.toFixed(1)}` : 'Add it in the morning check-in'}
      </span>
      {now && <span className="text-xs text-muted-foreground">{changeText(change, 'last week')}</span>}
      {recent.length >= 2 && (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-auto h-11 w-full" aria-hidden>
          <polyline
            points={recent.map((w) => `${dayX(w.date).toFixed(1)},${(36 - ((w.kg - lo) / span) * 32).toFixed(1)}`).join(' ')}
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
