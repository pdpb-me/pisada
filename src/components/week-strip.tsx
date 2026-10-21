import { useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { DayDot } from '@/hooks/use-week'
import { cn } from '@/lib/utils'

const DOT_CLASS: Record<string, string> = {
  done: 'bg-status-done',
  partial: 'bg-status-partial',
  skipped: 'bg-status-skipped',
}

const STATUS_WORD: Record<string, string> = {
  done: 'done',
  partial: 'partial',
  skipped: 'skipped',
}

function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// A sideways swipe of at least this many px (and more sideways than up/down) changes the week
const SWIPE_PX = 40

// Mon-Sun as day buttons, one dot per planned session. The chosen day is filled;
// today keeps a ring when another day is chosen. Swipe or the arrows show
// another week without changing the chosen day.
export function WeekStrip({
  days,
  dots,
  selected,
  today,
  onSelect,
  onWeek,
}: {
  days: string[]
  dots: Record<string, DayDot[]>
  selected: string
  today: string
  onSelect: (date: string) => void
  onWeek: (direction: -1 | 1) => void
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  // which way the last change went, so the new week slides in from that side
  const [direction, setDirection] = useState<-1 | 1 | 0>(0)
  const go = (dir: -1 | 1) => {
    setDirection(dir)
    onWeek(dir)
  }

  return (
    <nav
      className="flex flex-col gap-1.5"
      aria-label="Week"
      onTouchStart={(e) => {
        const t = e.touches[0]
        start.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={(e) => {
        if (!start.current) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.current.x
        const dy = t.clientY - start.current.y
        start.current = null
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) go(dx < 0 ? 1 : -1)
      }}
    >
      {!days.includes(today) && (
        <span className="text-center text-xs font-medium text-muted-foreground">
          {shortDay(days[0])} – {shortDay(days[6])}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="flex h-16 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
          aria-label="Previous week"
          onClick={() => go(-1)}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div
          key={days[0]}
          className={cn(
            'grid flex-1 grid-cols-7 gap-1 duration-200 motion-reduce:animate-none',
            direction === 1 && 'animate-in fade-in slide-in-from-right-6',
            direction === -1 && 'animate-in fade-in slide-in-from-left-6',
          )}
        >
          {days.map((iso) => {
            const d = new Date(`${iso}T12:00:00`)
            const sessions = dots[iso] ?? []
            const on = iso === selected
            const summary = sessions.length
              ? sessions.map((s) => `${s.slot} ${s.status ? STATUS_WORD[s.status] : 'pending'}`).join(', ')
              : 'nothing planned'
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(iso)}
                aria-current={on ? 'date' : undefined}
                aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${summary}`}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl',
                  on ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  !on && iso === today && 'ring-2 ring-primary ring-inset',
                )}
              >
                <span className={cn('text-[11px] font-medium', !on && 'text-muted-foreground')}>
                  {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                </span>
                <span className="text-base font-semibold">{d.getDate()}</span>
                <span className="flex h-1.5 gap-0.5">
                  {sessions.map((s) => (
                    <span
                      key={s.id}
                      className={cn(
                        'size-1.5 rounded-full',
                        on
                          ? s.status === 'done' || s.status === 'partial'
                            ? 'bg-primary-foreground'
                            : 'bg-primary-foreground/45'
                          : s.status
                            ? DOT_CLASS[s.status]
                            : 'bg-foreground/20',
                      )}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="flex h-16 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
          aria-label="Next week"
          onClick={() => go(1)}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
    </nav>
  )
}
