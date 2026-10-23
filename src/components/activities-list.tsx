import { useState } from 'react'
import {
  ActivityIcon,
  BikeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FootprintsIcon,
  MountainIcon,
  PersonStandingIcon,
  RefreshCwIcon,
  type LucideIcon,
} from 'lucide-react'
import { CardSkeleton, ErrorCard } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { LoggedRun } from '@/lib/ladder'
import type { TrendSymptom, WatchActivity } from '@/data/types'
import { useSync, useWatchMonth } from '@/hooks/use-watch-month'
import { addDays, mondayOf, shiftMonth, toISODate } from '@/lib/dates'
import { dayLabel, dayMonth, duration, km, monthName, time } from '@/lib/format'
import { painBand, painLabel } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { tinglingLabel } from '@/lib/tingling'
import { cn } from '@/lib/utils'

const SPORT: Record<string, { label: string; icon: LucideIcon }> = {
  run: { label: 'Run', icon: FootprintsIcon },
  bike: { label: 'Bike', icon: BikeIcon },
  strength: { label: 'Strength', icon: DumbbellIcon },
  walk: { label: 'Walk', icon: PersonStandingIcon },
  hike: { label: 'Hike', icon: MountainIcon },
}
const sportOf = (s: string) => SPORT[s] ?? { label: s.charAt(0).toUpperCase() + s.slice(1), icon: ActivityIcon }

// 'today 07:02', 'yesterday 07:02' or 'Mon 19 Oct, 07:02' (phone's time)
function syncedText(at: string, today: string) {
  const d = new Date(at)
  const day = toISODate(d)
  if (day === today) return `today ${time(d)}`
  if (day === addDays(today, -1)) return `yesterday ${time(d)}`
  return `${dayLabel(day)}, ${time(d)}`
}

// Activities tab: one month at a time (‹ November 2026 ›), its weeks newest first, by day
export function Activities({ today, runs, symptoms }: { today: string; runs: LoggedRun[]; symptoms: TrendSymptom[] }) {
  const thisMonth = mondayOf(today).slice(0, 7) // the month this week belongs to
  const [month, setMonth] = useState(thisMonth)
  const { items, error, retry, oldestMonth } = useWatchMonth(month)
  const sync = useSync()
  const total = (items ?? []).reduce((t, a) => t + (a.duration_s ?? 0), 0)

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="text-xs text-muted-foreground">
          {sync.syncedAt === undefined
            ? ' '
            : sync.syncedAt
              ? `From the watch · synced ${syncedText(sync.syncedAt, today)}`
              : 'Nothing synced yet'}
          <br />
          Updates at 07:00 and 20:00
        </span>
        <Button variant="outline" className="h-11 rounded-full" disabled={sync.busy} onClick={sync.syncNow}>
          <RefreshCwIcon className={cn(sync.busy && 'animate-spin motion-reduce:animate-none')} />
          {sync.busy ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>
      <nav className="flex items-center justify-between px-2 pt-3" aria-label="Month">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-muted-foreground"
          aria-label="Previous month"
          disabled={oldestMonth == null || month <= oldestMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
        <span className="flex flex-col items-center">
          <span className="text-base font-semibold">{monthName(month)}</span>
          <span className="text-xs text-muted-foreground">
            {items === undefined ? ' ' : `${items.length} ${items.length === 1 ? 'activity' : 'activities'} · ${duration(total)}`}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-muted-foreground"
          aria-label="Next month"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      </nav>
      {month !== thisMonth && (
        <Button variant="ghost" className="mx-auto h-11 text-primary" onClick={() => setMonth(thisMonth)}>
          Back to this month
        </Button>
      )}
      {error && !items ? (
        <div className="p-4">
          <ErrorCard what="the activities" onRetry={retry} />
        </div>
      ) : items === undefined ? (
        <div className="p-4">
          <CardSkeleton rows={4} />
        </div>
      ) : (
        <ActivitiesList
          watch={items}
          today={today}
          runs={runs}
          symptoms={symptoms}
          empty={oldestMonth == null ? 'Nothing synced from the watch yet.' : `Nothing from the watch in ${monthName(month)}.`}
        />
      )}
      <p className="px-6 pb-6 text-center text-xs text-muted-foreground">
        Load: the watch’s training load, worked out from heart rate and time.
      </p>
    </div>
  )
}

// Watch activities (Suunto → intervals.icu), by week and day, newest first. Each day shows
// that evening's neck and hands, so a long ride and a sore evening sit side by side.
export function ActivitiesList({
  watch,
  today,
  runs,
  symptoms,
  empty,
}: {
  watch: WatchActivity[]
  today: string
  runs: LoggedRun[]
  symptoms: TrendSymptom[]
  empty: string
}) {
  if (watch.length === 0) return <p className="p-8 text-center text-muted-foreground">{empty}</p>
  const thisMonday = mondayOf(today)
  const weeks = new Map<string, Map<string, WatchActivity[]>>()
  for (const a of watch) {
    const days = weeks.get(mondayOf(a.date)) ?? new Map<string, WatchActivity[]>()
    days.set(a.date, [...(days.get(a.date) ?? []), a])
    weeks.set(mondayOf(a.date), days)
  }
  const evening = (date: string, area: string) =>
    symptoms.find((s) => s.date === date && s.body_area === area && s.timing === 'evening')?.score

  return (
    <div className="flex flex-col gap-5 p-4">
      {[...weeks.entries()].map(([monday, days]) => {
        const items = [...days.values()].flat()
        const time = items.reduce((t, a) => t + (a.duration_s ?? 0), 0)
        const load = items.reduce((t, a) => t + (Number(a.load) || 0), 0)
        return (
          <section key={monday} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-base font-semibold">{monday === thisMonday ? 'This week' : `Week of ${dayMonth(monday)}`}</h2>
              <span className="text-sm text-muted-foreground">
                {duration(time)} · load {Math.round(load)}
              </span>
            </div>
            <Card className="gap-0 py-0">
              {[...days.entries()].map(([date, list]) => {
                const neck = evening(date, 'neck')
                const hands = evening(date, 'hands')
                return (
                  <div key={date} className="flex flex-col border-t px-4 py-2 first:border-t-0">
                    <div className="flex min-h-8 items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">{dayLabel(date)}</span>
                      {(neck != null || hands != null) && (
                        <span className="flex gap-2 text-xs text-muted-foreground">
                          {neck != null && (
                            <span className="inline-flex items-center gap-1">
                              Neck <span className={cn('size-1.5 rounded-full', PAIN_DOT[painBand(neck)])} aria-hidden />
                              <span className="text-foreground">{painLabel(neck)}</span>
                            </span>
                          )}
                          {hands != null && (
                            <span className="inline-flex items-center gap-1">
                              Hands <span className={cn('size-1.5 rounded-full', PAIN_DOT[painBand(hands)])} aria-hidden />
                              <span className="text-foreground">{tinglingLabel(hands)}</span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {list.map((a) => {
                      const sport = sportOf(a.sport)
                      const Icon = sport.icon
                      const run = a.sport === 'run' ? runs.find((r) => r.date === a.date) : undefined
                      const meta = [
                        a.distance_m ? km(a.distance_m) : null,
                        a.hr_avg ? `${a.hr_avg} bpm` : null,
                        a.elevation_m && a.sport === 'hike' ? `${a.elevation_m} m up` : null,
                        a.load != null ? `load ${Math.round(Number(a.load))}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <div key={a.id} className="flex min-h-14 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70">
                            <Icon className="size-[18px]" aria-hidden />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-base font-semibold">
                              {sport.label}
                              {run?.run_step != null && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  {' '}
                                  · step {run.run_step}
                                  {run.clean != null && (run.clean ? ', clean' : ', not clean')}
                                </span>
                              )}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">{meta}</span>
                          </span>
                          <span className="text-base font-semibold tabular-nums">{duration(a.duration_s)}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </Card>
          </section>
        )
      })}
    </div>
  )
}
