import { lazy, Suspense, useEffect, useState } from 'react'
import { ChevronRightIcon, MessageSquareTextIcon } from 'lucide-react'
import { CoachNoteSheet } from '@/components/coach-note'
import { FactorsList } from '@/components/factors-list'
import { areaFactors } from '@/lib/factors'
import { LadderDrawer } from '@/components/run-ladder'
import { ErrorCard } from '@/components/states'
import { StatusMark } from '@/components/status-mark'
import { TestHistory } from '@/components/test-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { data as store } from '@/data/store'
import type { ProgressData } from '@/data/types'
import { useNextTest, useProgress, useReview, useRunSteps, useWeekDots } from '@/hooks/use-data'
import { useScreens } from '@/hooks/use-screens'
import { useToday } from '@/lib/clock'
import { addDays, daysBetween, mondayOf, weekOf } from '@/lib/dates'
import { dayLabel, dayMonth, inDays, plural, weekdayLetter, weekdayShort } from '@/lib/format'
import { ladderStatus } from '@/lib/ladder'
import { painBand } from '@/lib/pain'
import { countsAsDone, PAIN_DOT } from '@/lib/session-status'
import { rightOfLeft, testDays } from '@/lib/tests'
import { AREAS, areaSummary, headline, VERDICT_TEXT, type AreaId } from '@/lib/trends'
import { cn } from '@/lib/utils'
import { changeText, weightChange } from '@/lib/weight'

// The detail screens and the activities list load when first opened
const PainDetail = lazy(() => import('@/components/pain-detail').then((m) => ({ default: m.PainDetail })))
const WeightDetail = lazy(() => import('@/components/weight-detail').then((m) => ({ default: m.WeightDetail })))
const Activities = lazy(() => import('@/components/activities-list').then((m) => ({ default: m.Activities })))

type Screen = { kind: 'overview' } | { kind: 'pain'; area: AreaId } | { kind: 'weight' }

// Overview (cards) | Activities (watch data); a card opens its detail.
export function Progress({ onDeepChange }: { onDeepChange: (deep: boolean) => void }) {
  const today = useToday()
  const progress = useProgress(today)
  const nav = useScreens<Screen>({ kind: 'overview' })
  const [tab, setTab] = useState<'overview' | 'activities'>('overview')
  const deep = nav.screen.kind !== 'overview'
  const data = progress.data

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  if (nav.screen.kind === 'pain' && data)
    return (
      <Suspense>
        <PainDetail area={nav.screen.area} data={data} onBack={nav.back} />
      </Suspense>
    )
  if (nav.screen.kind === 'weight' && data)
    return (
      <Suspense>
        <WeightDetail data={data} onBack={nav.back} />
      </Suspense>
    )

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-0">
        <header className="flex flex-col gap-3 border-b bg-card px-4 pt-4 pb-3">
          <h1 className="text-display font-bold">Progress</h1>
          <TabsList className="h-11 w-full">
            <TabsTrigger value="overview" className="h-9">
              Overview
            </TabsTrigger>
            <TabsTrigger value="activities" className="h-9">
              Activities
            </TabsTrigger>
          </TabsList>
        </header>

        <TabsContent value="overview">
          {progress.error && !data ? (
            <div className="p-4">
              <ErrorCard what="your progress" onRetry={progress.retry} />
            </div>
          ) : !data ? (
            <OverviewSkeleton />
          ) : (
            <Overview data={data} onOpen={(s) => nav.push(s)} />
          )}
        </TabsContent>
        <TabsContent value="activities">
          <Suspense fallback={<OverviewSkeleton />}>
            {data ? <Activities today={today} runs={data.runs} symptoms={data.symptoms} /> : <OverviewSkeleton />}
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-20 rounded-xl bg-card" />
      <Skeleton className="h-36 rounded-xl bg-card" />
      <Skeleton className="h-40 rounded-xl bg-card" />
      <Skeleton className="h-40 rounded-xl bg-card" />
    </div>
  )
}

function Overview({ data, onOpen }: { data: ProgressData; onOpen: (s: Screen) => void }) {
  const summaries = Object.fromEntries(
    (Object.keys(AREAS) as AreaId[]).map((a) => [a, areaSummary(data.symptoms, a, data.today)]),
  ) as Record<AreaId, ReturnType<typeof areaSummary>>
  const anything = data.symptoms.length > 0 || data.runs.length > 0 || data.weights.length > 0 || data.tests.length > 0

  return (
    <div className="flex flex-col gap-3 p-4">
      <Card className="gap-1 px-4 py-4">
        <span className="text-sm text-muted-foreground">Last 7 days</span>
        <p className="text-xl font-semibold text-balance">
          {anything
            ? headline({ arch: summaries.arch.verdict, neck: summaries.neck.verdict, hands: summaries.hands.verdict })
            : 'Trends show here after a week of check-ins.'}
        </p>
      </Card>
      <CoachRow today={data.today} />
      <WeekCard today={data.today} />
      {!anything && (
        <p className="px-1 text-sm text-muted-foreground">
          Answer the morning and evening check-ins on Today. After a week, this page shows how the arch, the neck and the hands are going.
        </p>
      )}
      {anything &&
        (Object.keys(AREAS) as AreaId[]).map((a) => (
          <AreaCard key={a} area={a} s={summaries[a]} onOpen={() => onOpen({ kind: 'pain', area: a })} />
        ))}
      <BadDayCard data={data} onOpen={() => onOpen({ kind: 'pain', area: 'neck' })} />
      <TestCard data={data} />
      <LadderCard data={data} />
      <WeightCard data={data} onOpen={() => onOpen({ kind: 'weight' })} />
      {import.meta.env.MODE !== 'demo' && (
        <Button variant="ghost" className="mt-4 h-11 self-center text-muted-foreground" onClick={() => store.auth.signOut()}>
          Log out
        </Button>
      )}
    </div>
  )
}

// A card that opens something: the whole card is the button
function CardButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('flex flex-col gap-3 rounded-xl bg-card px-4 py-4 text-left ring-1 ring-foreground/10 hover:bg-card/80', className)}
    >
      {children}
    </button>
  )
}

function CardTitle({ title, sub, chevron = true }: { title: string; sub?: string; chevron?: boolean }) {
  return (
    <span className="flex items-start justify-between gap-2">
      <span className="flex flex-col">
        <span className="text-base font-semibold">{title}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </span>
      {chevron && <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </span>
  )
}

// The coach's latest note, one row
function CoachRow({ today }: { today: string }) {
  const review = useReview(mondayOf(today)).data
  const [open, setOpen] = useState(false)
  if (!review) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-4 text-left ring-1 ring-foreground/10"
      >
        <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm">Coach’s note · week of {dayMonth(review.week_start)}</span>
        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
      </button>
      <CoachNoteSheet review={review} open={open} onOpenChange={setOpen} />
    </>
  )
}

// This week: one small mark per planned session
function WeekCard({ today }: { today: string }) {
  const days = weekOf(today)
  const dots = useWeekDots(days[0], days[6]).data ?? {}
  const all = Object.values(dots).flat()
  if (all.length === 0) return null
  const done = all.filter((d) => countsAsDone(d.status)).length
  const partial = all.filter((d) => d.status === 'partial').length
  const skipped = all.filter((d) => d.status === 'skipped').length
  return (
    <Card className="gap-3 px-4 py-4">
      <CardTitle title="This week" sub={`${dayMonth(days[0])} – ${dayMonth(days[6])}`} chevron={false} />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="flex items-baseline gap-1.5">
            <span className="text-display font-semibold tabular-nums">{done}</span>
            <span className="text-base text-muted-foreground">of {all.length} done</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {[partial > 0 && `${partial} partly`, skipped > 0 && `${skipped} skipped`].filter(Boolean).join(' · ') || ' '}
          </span>
        </div>
        <div className="flex items-end gap-1.5" aria-hidden>
          {days.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <div className="flex flex-col-reverse gap-1">
                {(dots[d] ?? []).slice(0, 3).map((s) => (
                  <StatusMark key={s.id} status={s.status} past={d < today} size="sm" />
                ))}
              </div>
              <span className={cn('text-xs', d === today ? 'font-bold' : 'text-muted-foreground')}>{weekdayLetter(d)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// One area: the word for the last 7 days (colour: the worse of that and the latest),
// the latest answer when it differs, the verdict, and 14 daily bars
function AreaCard({ area, s, onOpen }: { area: AreaId; s: ReturnType<typeof areaSummary>; onOpen: () => void }) {
  const a = AREAS[area]
  const tingling = a.scale === 'tingling'
  return (
    <CardButton onClick={onOpen} label={`${a.title}: open the details`}>
      <CardTitle
        title={a.title}
        sub={area === 'arch' ? 'Right arch, first steps' : area === 'neck' ? 'Neck, over the day' : 'Hand tingling, over the day'}
      />
      {s.typical != null ? (
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className={cn('size-3 rounded-full', PAIN_DOT[painBand(s.worst!)])} aria-hidden />
            <span className="text-display font-semibold">
              {tingling ? (s.badDays ? `${s.badDays} of ${s.answered} days` : 'None') : a.label(s.typical)}
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            {tingling ? 'Tingled, last 7 days' : 'Usual, last 7 days'}
            {!tingling &&
              s.latest &&
              a.label(s.latest.score) !== a.label(s.typical) &&
              ` · latest ${a.label(s.latest.score)} (${weekdayShort(s.latest.date)})`}
          </span>
          <span className="text-sm font-medium">{VERDICT_TEXT[s.verdict]}</span>
        </span>
      ) : (
        <span className="flex flex-col gap-0.5">
          <span className="text-base font-semibold">Not enough answers yet</span>
          <span className="text-sm text-muted-foreground">{s.answered} of the last 7 days answered. It shows from 3.</span>
        </span>
      )}
      <span className="flex h-10 items-end gap-0.5" aria-hidden>
        {s.series.map((d) => (
          <span
            key={d.date}
            className={cn('flex-1 rounded-[2px]', d.score == null ? 'h-1 bg-foreground/10' : PAIN_DOT[painBand(d.score)])}
            style={d.score == null ? undefined : { height: `${d.score === 0 ? 4 : Math.round(8 + d.score * 3.2)}px` }}
          />
        ))}
      </span>
      <span className="-mt-2 flex justify-between text-xs text-muted-foreground">
        <span>2 weeks ago</span>
        <span>Today</span>
      </span>
    </CardButton>
  )
}

// What goes with a bad neck day, short: the top two
function BadDayCard({ data, onOpen }: { data: ProgressData; onOpen: () => void }) {
  const result = areaFactors('neck', data, 28)
  if (!result.enough || !result.factors.length) return null
  return (
    <CardButton onClick={onOpen} label="What goes with a bad neck day: open the neck details">
      <CardTitle title="What goes with a bad neck day" sub="Last 4 weeks" />
      <FactorsList area="neck" result={result} limit={2} />
    </CardButton>
  )
}

// Heel-raise test: the latest result per side, the change since the first, the right as a
// share of the left, and when the next one is. Tap: every test.
function TestCard({ data }: { data: ProgressData }) {
  const next = useNextTest(data.today)
  const [open, setOpen] = useState(false)
  const days = testDays(data.tests.filter((t) => t.test === 'sl_heel_raise'))
  const first = days[0]
  const last = days[days.length - 1]
  if (!last && !next) return null
  const nextText = next
    ? `Next test ${inDays(next.date, data.today) === 'today' ? 'today' : `${dayLabel(next.date)} (${inDays(next.date, data.today)})`}`
    : null
  return (
    <>
      <CardButton onClick={() => last && setOpen(true)} label="Heel-raise tests: see every test">
        <CardTitle title="Heel-raise test" sub="Clean reps on one leg" chevron={!!last} />
        {last ? (
          <span className="grid grid-cols-2 gap-3">
            {(['L', 'R'] as const).map((side) => {
              const change = first !== last && first[side] != null && last[side] != null ? last[side]! - first[side]! : null
              return (
                <span key={side} className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{side === 'L' ? 'Left' : 'Right'}</span>
                  <span className="text-display font-semibold tabular-nums">{last[side] ?? '–'}</span>
                  {change != null && (
                    <span className="text-sm text-muted-foreground">
                      {change > 0 ? `+${change}` : change} since {dayMonth(first.date)}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
        ) : (
          <span className="text-base text-muted-foreground">No result yet.</span>
        )}
        <span className="text-sm text-muted-foreground">
          {[last && rightOfLeft(last) != null && `Right is ${rightOfLeft(last)}% of left (${dayMonth(last.date)})`, nextText]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </CardButton>
      <TestHistory days={days} open={open} onOpenChange={setOpen} />
    </>
  )
}

// The run ladder: the next planned step (the coach decides it), the last run, and the
// last runs as marks. No streaks: just what happened.
function LadderCard({ data }: { data: ProgressData }) {
  const steps = useRunSteps()
  const [open, setOpen] = useState(false)
  const s = ladderStatus(data.runs, data.nextRun)
  if (!steps.length && !s.last) return null
  const total = Math.max(steps.length, s.last?.run_step ?? 0, s.next?.run_step ?? 0)
  const nextStep = s.next?.run_step ?? null
  return (
    <>
      <CardButton onClick={() => setOpen(true)} label="Run ladder: see every step">
        <CardTitle title="Run ladder" sub="Run–walk, planned by your coach" />
        <span className="flex flex-col gap-0.5">
          <span className="text-display font-semibold">
            {s.next ? (nextStep != null ? `Step ${nextStep}` : 'Step not set yet') : s.last ? `Step ${s.last.run_step}` : '–'}
            {total > 0 && (s.next ? nextStep != null : true) && (
              <span className="text-base font-normal text-muted-foreground"> of {total}</span>
            )}
          </span>
          <span className="text-sm text-muted-foreground">
            {s.next ? `Next run ${dayLabel(s.next.date)}` : 'No run planned yet'}
            {s.last &&
              ` · last run step ${s.last.run_step}, ${s.last.clean == null ? 'clean not decided yet' : s.last.clean ? 'clean' : 'not clean'}`}
          </span>
        </span>
        {s.recent.length > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            Last runs
            {s.recent.map((r, i) => (
              <span
                key={i}
                title={`${dayLabel(r.date)}: ${r.clean == null ? 'not decided' : r.clean ? 'clean' : 'not clean'}`}
                className={cn(
                  'inline-flex h-6 items-center rounded-full px-2 text-xs font-medium',
                  r.clean == null
                    ? 'ring-1 ring-foreground/20'
                    : r.clean
                      ? 'bg-foreground/80 text-background'
                      : 'bg-pain-mid/25 text-foreground',
                )}
              >
                {r.clean == null ? '?' : r.clean ? 'clean' : 'not'}
              </span>
            ))}
          </span>
        )}
        <span className="flex w-full gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full',
                i < (s.last?.run_step ?? 0) ? 'bg-foreground/80' : 'bg-muted',
                nextStep != null && i === nextStep - 1 && i >= (s.last?.run_step ?? 0) && 'ring-2 ring-foreground/60 ring-inset',
              )}
            />
          ))}
        </span>
      </CardButton>
      <LadderDrawer
        open={open}
        onOpenChange={setOpen}
        steps={steps}
        current={nextStep ?? s.last?.run_step ?? null}
        currentLabel={nextStep != null ? 'Planned' : 'Last run'}
      />
    </>
  )
}

// Weight: the 7-day average and its change, and a small 4-week line
function WeightCard({ data, onOpen }: { data: ProgressData; onOpen: () => void }) {
  const last = data.weights[data.weights.length - 1]
  if (!last) return null
  const { now, change } = weightChange(data.weights, data.today, 7)
  const recent = data.weights.filter((w) => w.date > addDays(data.today, -28))
  const lo = Math.min(...recent.map((w) => w.kg))
  const hi = Math.max(...recent.map((w) => w.kg))
  const span = Math.max(hi - lo, 0.5)
  const dayX = (d: string) => (daysBetween(addDays(data.today, -27), d) / 27) * 100
  return (
    <CardButton onClick={onOpen} label="Weight: open the details">
      <CardTitle title="Weight" sub={`Last entry ${dayMonth(last.date)}`} />
      <span className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-display font-semibold tabular-nums">{(now?.kg ?? last.kg).toFixed(1)} kg</span>
          <span className="text-sm text-muted-foreground">
            {now ? `7-day average · ${changeText(change, 'the week before')}` : 'Last entry'}
          </span>
        </span>
        {recent.length >= 2 && (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-24 shrink-0" aria-hidden>
            <polyline
              points={recent.map((w) => `${dayX(w.date).toFixed(1)},${(36 - ((w.kg - lo) / span) * 32).toFixed(1)}`).join(' ')}
              fill="none"
              className="stroke-foreground/70"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="sr-only">{plural(recent.length, 'entry', 'entries')} in 4 weeks</span>
    </CardButton>
  )
}
