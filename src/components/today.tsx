import { useState } from 'react'
import { LogOutIcon } from 'lucide-react'
import { MorningCheck } from '@/components/morning-check'
import { SessionCard } from '@/components/session-card'
import { WeekStrip } from '@/components/week-strip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDay, type DaySession, type Status } from '@/hooks/use-day'
import { useRunSteps, type RunStep } from '@/hooks/use-run-steps'
import { useWeek } from '@/hooks/use-week'
import { addDays, longDate, todayISO, weekOf } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

// Opens on today. The week strip opens other days (e.g. to fix yesterday's log).
export function Today() {
  const today = todayISO()
  const [date, setDate] = useState(today)
  const days = weekOf(date)
  const week = useWeek(days)
  const runSteps = useRunSteps()
  const isToday = date === today

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {isToday
              ? 'Today'
              : new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}
          </h1>
          <p className="text-sm text-muted-foreground">{longDate(date)}</p>
        </div>
        <div className="flex items-center">
          {!isToday && (
            <Button variant="ghost" className="h-11" onClick={() => setDate(today)}>
              Back to today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Log out"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOutIcon />
          </Button>
        </div>
      </header>

      <WeekStrip
        days={days}
        dots={week.dots}
        selected={date}
        today={today}
        onSelect={setDate}
        onWeek={(dir) => setDate(addDays(date, dir * 7))}
      />

      {isToday && <MorningCheck date={date} />}

      {/* key: a fresh view per day, so the previous day never shows while loading */}
      <DaySessions key={date} date={date} runSteps={runSteps} onStatusSaved={week.reload} />
    </main>
  )
}

function DaySessions({
  date,
  runSteps,
  onStatusSaved,
}: {
  date: string
  runSteps: RunStep[]
  onStatusSaved: () => void
}) {
  const { sessions, setStatus, setPain, setRun, setComment, setTest } = useDay(date)

  async function changeStatus(s: DaySession, status: Status | null) {
    await setStatus(s, status)
    onStatusSaved()
  }

  if (sessions === undefined) {
    return (
      <>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </>
    )
  }
  if (sessions.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">Nothing planned.</p>
  }

  return (
    <SessionList
      sessions={sessions}
      renderCard={(s) => (
        <SessionCard
          key={s.id}
          session={s}
          runSteps={runSteps}
          onStatus={(status) => changeStatus(s, status)}
          onPain={(area, score) => setPain(s, area, score)}
          onRun={(changes) => setRun(s, changes)}
          onComment={(comment) => setComment(s, comment)}
          onTest={(spec, side, value) => setTest(s, spec, side, value)}
        />
      )}
    />
  )
}

const SLOTS = [
  { slot: 'am', label: 'Morning' },
  { slot: 'pm', label: 'Evening' },
]

// Sessions under a Morning / Evening heading; a slot with nothing planned is left out.
export function SessionList({
  sessions,
  renderCard,
}: {
  sessions: DaySession[]
  renderCard: (session: DaySession) => React.ReactNode
}) {
  return SLOTS.map(({ slot, label }) => {
    const inSlot = sessions.filter((s) => s.slot === slot)
    if (inSlot.length === 0) return null
    return (
      <section key={slot} className="flex flex-col gap-3">
        <h2 className="pt-2 text-sm font-medium text-muted-foreground">{label}</h2>
        {inSlot.map(renderCard)}
      </section>
    )
  })
}
