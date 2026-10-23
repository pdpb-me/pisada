import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EveningCheckIn, MorningCheckIn } from '@/components/check-ins'
import { CoachNote } from '@/components/coach-note'
import { ExerciseScreen } from '@/components/exercise-screen'
import { PlanList } from '@/components/plan-list'
import { SessionScreen, type SessionHandlers } from '@/components/session-screen'
import { CardSkeleton, EmptyNote, ErrorCard } from '@/components/states'
import { WeekStrip } from '@/components/week-strip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { write } from '@/data/store'
import type { DayDot } from '@/data/types'
import { useCheckIns } from '@/hooks/use-check-ins'
import { useLastLog, useLastRunStep, useReview, useRunSteps, useWeekDots } from '@/hooks/use-data'
import { useDay } from '@/hooks/use-day'
import { useScreens } from '@/hooks/use-screens'
import { useHour, useToday } from '@/lib/clock'
import { dueCheckIns } from '@/lib/check-ins'
import { addDays, daysBetween, mondayOf, weekOf } from '@/lib/dates'
import { dayMonth, inDays, longDate, plural, weekday } from '@/lib/format'
import { getPref, setPref } from '@/lib/prefs'

type Screen = { kind: 'day' } | { kind: 'session'; id: string; openLog?: boolean } | { kind: 'exercise'; id: string; index: number }

// Opens on today. Three screens: the day (check-ins + plan) → a session → an exercise.
// The week strip opens other days (e.g. to fill in yesterday).
export function Today({ onDeepChange }: { onDeepChange: (deep: boolean) => void }) {
  const today = useToday()
  // the chosen day; null follows today (also when the app is reopened the next morning)
  const [picked, setPicked] = useState<string | null>(null)
  const date = picked ?? today
  // the strip shows the chosen day's week; swiping or the arrows go to the same weekday
  // in the week before or after, so the strip and the page always agree
  const monday = mondayOf(date)
  const days = weekOf(monday)
  // dots for the week before and after too: the strip shows them while it's dragged
  const week = useWeekDots(addDays(monday, -7), addDays(monday, 13))
  const choose = (d: string) => {
    setPicked(d === today ? null : d)
  }

  // key: a fresh day (and screen stack) per date, so the previous day never shows while loading
  return (
    <Day
      key={date}
      date={date}
      today={today}
      days={days}
      dots={week.data ?? {}}
      onDate={choose}
      onWeek={(dir) => choose(addDays(date, dir * 7))}
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
  onDeepChange,
}: {
  date: string
  today: string
  days: string[]
  dots: Record<string, DayDot[]>
  onDate: (date: string) => void
  onWeek: (direction: -1 | 1) => void
  onDeepChange: (deep: boolean) => void
}) {
  const day = useDay(date)
  const checkIns = useCheckIns(date)
  const steps = useRunSteps()
  const lastStep = useLastRunStep()
  const hour = useHour()
  const nav = useScreens<Screen>({ kind: 'day' })
  const isToday = date === today
  const deep = nav.screen.kind !== 'day'
  const ask = dueCheckIns(date, today, hour)

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  const handlers = (id: string): SessionHandlers => {
    const s = () => day.sessions!.find((x) => x.id === id)!
    return {
      onStatus: (status) => day.setStatus(s(), status),
      onPain: (area, score) => day.setPain(s(), area, score),
      onRun: (changes) => day.setRun(s(), changes),
      onComment: (comment) => day.setComment(s(), comment),
      onTest: (spec, side, value) => day.setTest(s(), spec, side, value),
      onMove: async (newDate, slot) => {
        const before = s()
        const ok = await day.moveSession(before, newDate, slot)
        if (ok)
          toast(`Moved to ${longDate(newDate)}`, {
            action: newDate !== date ? { label: 'Go to day', onClick: () => onDate(newDate) } : undefined,
            cancel: { label: 'Undo', onClick: () => void write.moveSession(before.id, before.date, before.slot) },
          })
        return ok
      },
    }
  }

  const current = 'id' in nav.screen ? day.sessions?.find((s) => s.id === (nav.screen as { id: string }).id) : undefined

  if (nav.screen.kind === 'session' && current) {
    return (
      <main className="animate-screen-in mx-auto min-h-svh max-w-md">
        <SessionScreen
          session={current}
          steps={steps}
          lastStep={lastStep}
          today={today}
          handlers={handlers(current.id)}
          openLog={nav.screen.kind === 'session' && !!nav.screen.openLog}
          onBack={nav.back}
          onOpenExercise={(index) => nav.push({ kind: 'exercise', id: current.id, index })}
        />
      </main>
    )
  }
  if (nav.screen.kind === 'exercise' && current) {
    return (
      <main className="animate-screen-in mx-auto min-h-svh max-w-md bg-card">
        <ExerciseScreen
          session={current}
          index={nav.screen.index}
          onBack={nav.back}
          onIndex={(index) => nav.replace({ kind: 'exercise', id: current.id, index })}
          onFinish={async () => {
            if (!current.log) await day.setStatus(current, 'done')
            nav.back()
          }}
        />
      </main>
    )
  }

  const morning = <MorningCheckIn state={checkIns} ask={ask.morning} isToday={isToday} afternoon={isToday && hour >= 12} />
  const evening = <EveningCheckIn state={checkIns} ask={ask.evening} isToday={isToday} />
  const eveningFirst = isToday && ask.evening === 'now' && checkIns.checkIns?.neck == null
  const morningFirst = !isToday || hour < 12 || checkIns.checkIns?.arch != null
  const subtitle = isToday ? longDate(date) : `${dayMonth(date)} · ${inDays(date, today)}`

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <header className="flex flex-col gap-3 border-b bg-card px-3 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 pl-1">
          <div className="flex min-w-0 flex-col">
            <h1 className="text-display font-bold">{isToday ? 'Today' : weekday(date)}</h1>
            <p className="text-sm text-muted-foreground">
              {subtitle}
              {!isToday && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => onDate(today)}
                  >
                    Back to today
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full text-muted-foreground"
              aria-label="Previous week"
              onClick={() => onWeek(-1)}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full text-muted-foreground"
              aria-label="Next week"
              onClick={() => onWeek(1)}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>
        </div>
        <WeekStrip days={days} dots={dots} selected={date} today={today} onSelect={onDate} onWeek={onWeek} />
      </header>

      <div className="flex flex-col gap-3 p-4">
        {isToday && <TodayNotes today={today} dots={dots} onDate={onDate} />}

        {/* the check-in that's due comes first: the morning before noon, the evening from 18:00 */}
        {eveningFirst ? evening : morningFirst && morning}

        {day.error && !day.sessions ? (
          <ErrorCard what="this day" onRetry={day.retry} />
        ) : day.sessions === undefined ? (
          <CardSkeleton />
        ) : day.sessions.length === 0 ? (
          <NothingPlanned dots={dots} />
        ) : (
          <PlanList
            sessions={day.sessions}
            steps={steps}
            date={date}
            today={today}
            onOpen={(id, openLog) => nav.push({ kind: 'session', id, openLog })}
            onStatus={day.setStatus}
          />
        )}

        {eveningFirst ? morning : !morningFirst ? (
          <>
            {morning}
            {evening}
          </>
        ) : (
          evening
        )}
        {checkIns.error && !checkIns.checkIns && <ErrorCard what="the check-ins" onRetry={checkIns.retry} />}
      </div>
    </main>
  )
}

// No sessions on this day: a rest day, or no plan at all yet
function NothingPlanned({ dots }: { dots: Record<string, DayDot[]> }) {
  const planned = Object.values(dots).some((d) => d.length > 0)
  if (planned) return <EmptyNote title="Rest day">Nothing planned. Walks and bike rides still count: the watch keeps them.</EmptyNote>
  return (
    <EmptyNote title="No plan yet">
      Your coach writes the plan at the weekly check-in in the chat. Say “weekly check-in” there, and it shows here.
    </EmptyNote>
  )
}

// At the top of today: the coach's note for this week, and a word about yesterday or a gap
function TodayNotes({ today, dots, onDate }: { today: string; dots: Record<string, DayDot[]>; onDate: (d: string) => void }) {
  const review = useReview(mondayOf(today)).data
  const lastLog = useLastLog(today).data
  const yesterday = addDays(today, -1)
  const yCheckIns = useCheckIns(yesterday).checkIns
  const [hidden, setHidden] = useState(() => getPref('yesterday-hidden') === yesterday)
  const [welcomed, setWelcomed] = useState(() => getPref('welcome-hidden') === today)

  const thisWeeksNote = review && review.week_start === mondayOf(today) ? review : null
  const away = lastLog && daysBetween(lastLog.date, today) >= 4 ? daysBetween(lastLog.date, today) : 0

  const yDots = dots[yesterday] ?? []
  const missing = [
    yDots.filter((d) => !d.status).length > 0 && plural(yDots.filter((d) => !d.status).length, 'session'),
    yCheckIns && yCheckIns.arch == null && 'the morning',
    yCheckIns && (yCheckIns.neck == null || yCheckIns.hands == null) && 'the evening',
  ].filter((x): x is string => !!x)

  return (
    <>
      {thisWeeksNote && <CoachNote review={thisWeeksNote} />}
      {away ? (
        !welcomed && (
          <EmptyNote
            title="Welcome back"
            action={
              <Button
                variant="ghost"
                className="-mx-2 h-11 px-2 text-primary"
                onClick={() => {
                  setPref('welcome-hidden', today)
                  setWelcomed(true)
                }}
              >
                OK
              </Button>
            }
          >
            {away} days without the app. Past days stay as they are: no need to fill them in. Start with today.
          </EmptyNote>
        )
      ) : (
        lastLog &&
        !hidden &&
        missing.length > 0 && (
          <Card className="gap-1 px-4 pt-3 pb-2">
            <span className="text-sm">
              <span className="font-medium">Yesterday:</span>{' '}
              <span className="text-muted-foreground">
                {missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]} not logged
              </span>
            </span>
            <span className="-mr-2 flex justify-end gap-1">
              <Button
                variant="ghost"
                className="h-11 rounded-full px-3 text-muted-foreground"
                onClick={() => {
                  setPref('yesterday-hidden', yesterday)
                  setHidden(true)
                }}
              >
                Leave it
              </Button>
              <Button variant="outline" className="h-11 rounded-full px-4" onClick={() => onDate(yesterday)}>
                Fill in
              </Button>
            </span>
          </Card>
        )
      )}
    </>
  )
}
