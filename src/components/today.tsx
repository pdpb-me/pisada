import { useEffect, useState } from 'react'
import { LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EveningCheck } from '@/components/evening-check'
import { ExerciseScreen } from '@/components/exercise-screen'
import { MorningCheck } from '@/components/morning-check'
import { PlanCard } from '@/components/plan-card'
import { SessionScreen, type SessionHandlers } from '@/components/session-screen'
import { WeekStrip } from '@/components/week-strip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDay, type DaySession } from '@/hooks/use-day'
import { useLastRunStep, useRunSteps, type RunStep } from '@/hooks/use-run-steps'
import { useScreens } from '@/hooks/use-screens'
import { useWeek, type DayDot } from '@/hooks/use-week'
import { data } from '@/data/store'
import { useToday } from '@/lib/clock'
import { addDays, longDate, weekOf } from '@/lib/dates'

type Screen = { kind: 'day' } | { kind: 'session'; id: string } | { kind: 'exercise'; id: string; index: number }

// Opens on today. Three screens: the day (plan + check-ins) → a session → an exercise.
// The week strip opens other days (e.g. to fix yesterday's log).
export function Today({ onDeepChange }: { onDeepChange: (deep: boolean) => void }) {
  const today = useToday()
  const [date, setDate] = useState(today)
  // the week shown in the strip: swiping or the arrows change it, the chosen day stays
  const [monday, setMonday] = useState(() => weekOf(today)[0])
  const days = weekOf(monday)
  // dots for the week before and after too: the strip shows them while it's dragged
  const week = useWeek([addDays(monday, -7), addDays(monday, 13)])
  const choose = (d: string) => {
    setDate(d)
    setMonday(weekOf(d)[0])
  }
  const runSteps = useRunSteps()
  // the step a planned run will use (for its rough time): the last logged run's
  const currentStep = useLastRunStep()

  // key: a fresh day (and screen stack) per date, so the previous day never shows while loading
  return (
    <Day
      key={date}
      date={date}
      today={today}
      days={days}
      dots={week.dots}
      onDate={choose}
      onWeek={(dir) => setMonday(addDays(monday, dir * 7))}
      runSteps={runSteps}
      currentStep={currentStep}
      onDeepChange={onDeepChange}
    />
  )
}

function Day({
  date,
  today,
  days,
  dots,
  onDate,
  onWeek,
  runSteps,
  currentStep,
  onDeepChange,
}: {
  date: string
  today: string
  days: string[]
  dots: Record<string, DayDot[]>
  onDate: (date: string) => void
  onWeek: (direction: -1 | 1) => void
  runSteps: RunStep[]
  currentStep: number | null
  onDeepChange: (deep: boolean) => void
}) {
  const day = useDay(date)
  const nav = useScreens<Screen>({ kind: 'day' })
  const isToday = date === today
  const deep = nav.screen.kind !== 'day'

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  const handlers = (s: DaySession): SessionHandlers => ({
    onStatus: (status) => day.setStatus(s, status),
    onPain: (area, score) => day.setPain(s, area, score),
    onRun: (changes) => day.setRun(s, changes),
    onComment: (comment) => day.setComment(s, comment),
    onTest: (spec, side, value) => day.setTest(s, spec, side, value),
    onMove: async (newDate, slot) => {
      const ok = await day.moveSession(s, newDate, slot)
      if (ok) toast.success(`Moved to ${longDate(newDate)}`)
      return ok
    },
  })

  const current = 'id' in nav.screen ? day.sessions?.find((s) => s.id === (nav.screen as { id: string }).id) : undefined

  if (nav.screen.kind === 'session' && current) {
    return (
      <main className="mx-auto min-h-svh max-w-md">
        <SessionScreen
          session={current}
          runSteps={runSteps}
          currentStep={currentStep}
          handlers={handlers(current)}
          onBack={nav.back}
          onOpenExercise={(index) => nav.push({ kind: 'exercise', id: current.id, index })}
        />
      </main>
    )
  }
  if (nav.screen.kind === 'exercise' && current) {
    return (
      <main className="mx-auto min-h-svh max-w-md bg-card">
        <ExerciseScreen
          session={current}
          index={nav.screen.index}
          onBack={nav.back}
          onIndex={(index) => nav.replace({ kind: 'exercise', id: current.id, index })}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <div className="flex flex-col gap-3.5 border-b bg-card px-3 pt-5 pb-3.5">
        <header className="flex items-end justify-between px-1">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[28px] font-bold tracking-tight">
              {isToday ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}
            </h1>
            <p className="text-sm text-muted-foreground">{longDate(date)}</p>
          </div>
          <div className="flex items-center">
            {(!isToday || !days.includes(today)) && (
              <Button variant="ghost" className="h-11 text-primary" onClick={() => onDate(today)}>
                Back to today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground"
              aria-label="Log out"
              onClick={() => data.auth.signOut()}
            >
              <LogOutIcon />
            </Button>
          </div>
        </header>
        <WeekStrip
          days={days}
          dots={dots}
          selected={date}
          today={today}
          onSelect={onDate}
          onWeek={onWeek}
        />
      </div>

      <div className="flex flex-col gap-3 p-4">
        {day.sessions === undefined ? (
          <Skeleton className="h-48 rounded-[18px]" />
        ) : (
          <PlanCard
            sessions={day.sessions}
            runSteps={runSteps}
            currentStep={currentStep}
            onOpen={(id) => nav.push({ kind: 'session', id })}
          />
        )}

        {/* the day's check-ins: today and past days, never future ones */}
        {date <= today && (
          <div className="grid grid-cols-2 gap-3">
            <MorningCheck date={date} isToday={isToday} />
            <EveningCheck date={date} isToday={isToday} />
          </div>
        )}

        <WeekCard dots={Object.fromEntries(days.map((d) => [d, dots[d] ?? []]))} thisWeek={days.includes(today)} />
      </div>
    </main>
  )
}

// Calm facts, not streaks: how the shown week is going
function WeekCard({ dots, thisWeek }: { dots: Record<string, DayDot[]>; thisWeek: boolean }) {
  const all = Object.values(dots).flat()
  if (all.length === 0) return null
  const done = all.filter((d) => d.status === 'done' || d.status === 'partial').length
  return (
    <Card className="flex-row items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{thisWeek ? 'This week' : 'That week'}</span>
        <span className="text-base font-semibold">
          {done} of {all.length} sessions done
        </span>
      </div>
      <div className="flex h-2 w-28 rounded-full bg-muted" aria-hidden>
        <span className="rounded-full bg-primary" style={{ width: `${Math.round((done / all.length) * 100)}%` }} />
      </div>
    </Card>
  )
}
