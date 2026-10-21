import { useState } from 'react'
import {
  ActivityIcon,
  BikeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FootprintsIcon,
  MountainIcon,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WatchActivity } from '@/hooks/use-progress'
import { useWatchMonth } from '@/hooks/use-watch-month'
import { toISODate, weekOf } from '@/lib/dates'

const SPORT: Record<string, { label: string; icon: LucideIcon }> = {
  run: { label: 'Run', icon: FootprintsIcon },
  bike: { label: 'Bike', icon: BikeIcon },
  strength: { label: 'Strength', icon: DumbbellIcon },
  walk: { label: 'Walk', icon: FootprintsIcon },
  hike: { label: 'Hike', icon: MountainIcon },
}

function duration(s: number | null) {
  if (s == null) return '–'
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

function dayText(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function monthName(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}-01T12:00:00`)
  d.setMonth(d.getMonth() + by)
  return toISODate(d).slice(0, 7)
}

// Activities tab: one month at a time (‹ October 2026 ›), its weeks newest first
export function Activities({ today }: { today: string }) {
  const thisMonth = weekOf(today)[0].slice(0, 7) // the month this week belongs to
  const [month, setMonth] = useState(thisMonth)
  const { items, oldestMonth } = useWatchMonth(month)
  const time = (items ?? []).reduce((t, a) => t + (a.duration_s ?? 0), 0)

  return (
    <div className="flex flex-col">
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
          <span className="text-[17px] font-semibold">{monthName(month)}</span>
          <span className="text-xs text-muted-foreground">
            {items === undefined ? ' ' : `${items.length} ${items.length === 1 ? 'activity' : 'activities'} · ${duration(time)}`}
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
      {items === undefined ? (
        <div className="p-4">
          <Skeleton className="h-48 rounded-[18px]" />
        </div>
      ) : (
        <ActivitiesList
          watch={items}
          today={today}
          empty={oldestMonth == null ? 'Nothing synced from the watch yet.' : `Nothing from the watch in ${monthName(month)}.`}
        />
      )}
    </div>
  )
}

// Watch activities (Suunto → intervals.icu), grouped by week, newest first
export function ActivitiesList({ watch, today, empty }: { watch: WatchActivity[]; today: string; empty: string }) {
  if (watch.length === 0) {
    return <p className="p-8 text-center text-muted-foreground">{empty}</p>
  }
  const thisMonday = weekOf(today)[0]
  const weeks = new Map<string, WatchActivity[]>()
  for (const a of watch) {
    const monday = weekOf(a.date)[0]
    weeks.set(monday, [...(weeks.get(monday) ?? []), a])
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {[...weeks.entries()].map(([monday, items]) => {
        const time = items.reduce((t, a) => t + (a.duration_s ?? 0), 0)
        const load = items.reduce((t, a) => t + (Number(a.load) || 0), 0)
        return (
          <section key={monday} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-[15px] font-semibold">
                {monday === thisMonday ? 'This week' : `Week of ${dayText(monday)}`}
              </h2>
              <span className="text-sm text-muted-foreground">
                {items.length} · {duration(time)} · load {Math.round(load)}
              </span>
            </div>
            <Card className="gap-0 px-3.5 py-1">
              {items.map((a) => {
                const sport = SPORT[a.sport] ?? { label: a.sport.charAt(0).toUpperCase() + a.sport.slice(1), icon: ActivityIcon }
                const Icon = sport.icon
                const meta = [
                  a.distance_m ? `${(a.distance_m / 1000).toFixed(1)} km` : null,
                  a.hr_avg ? `${a.hr_avg} bpm` : null,
                  a.load != null ? `load ${Math.round(Number(a.load))}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <div key={a.id} className="flex min-h-15 items-center gap-3 border-t first:border-t-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold">{sport.label}</span>
                      <span className="text-xs text-muted-foreground">{dayText(a.date)}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-[15px] font-semibold">{duration(a.duration_s)}</span>
                      <span className="text-xs text-muted-foreground">{meta}</span>
                    </span>
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
