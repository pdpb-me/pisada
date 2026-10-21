import { useLayoutEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { DayDot } from '@/hooks/use-week'
import { addDays, weekOf } from '@/lib/dates'
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

// Chrome 114+ tells when a scroll has settled; older browsers get a short pause instead
const HAS_SCROLLEND = 'onscrollend' in window

function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Mon-Sun as day buttons, one dot per planned session. The chosen day is filled;
// today keeps a ring when another day is chosen.
// The strip holds three weeks (before, shown, after) in a sideways scroller that snaps
// to whole weeks: the days follow the finger, and when it settles on a neighbour week
// that week becomes the shown one and the scroller jumps back to the middle, unseen.
// The arrows scroll the same way. The chosen day never changes by scrolling.
export function WeekStrip({
  days,
  dots,
  selected,
  today,
  onSelect,
  onWeek,
}: {
  days: string[]
  dots: Record<string, DayDot[]> // for all three weeks
  selected: string
  today: string
  onSelect: (date: string) => void
  onWeek: (direction: -1 | 1) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const first = days[0]
  const weeks = [weekOf(addDays(first, -7)), days, weekOf(addDays(first, 7))]

  // the shown week sits in the middle
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.clientWidth
  }, [first])

  // once the scroll has settled on a neighbour week, make it the shown week
  const settle = () => {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return
    const panel = Math.round(el.scrollLeft / el.clientWidth)
    if (panel === 0) onWeek(-1)
    if (panel === 2) onWeek(1)
  }

  // scrollend where the browser has it (Chrome 114+), else a short pause after the last scroll
  const pause = useRef<number | undefined>(undefined)
  const onScroll = () => {
    if (HAS_SCROLLEND) return
    window.clearTimeout(pause.current)
    pause.current = window.setTimeout(settle, 150)
  }

  const scrollBy = (dir: -1 | 1) => {
    const el = scroller.current
    if (el) el.scrollTo({ left: el.clientWidth * (1 + dir), behavior: 'smooth' })
  }

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Week">
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
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div
          ref={scroller}
          onScroll={onScroll}
          onScrollEnd={settle}
          className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {weeks.map((week, w) => (
            <div
              key={week[0]}
              aria-hidden={w !== 1 || undefined}
              className="grid w-full shrink-0 snap-center snap-always grid-cols-7 gap-1 px-0.5"
            >
              {week.map((iso) => {
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
                    tabIndex={w === 1 ? undefined : -1}
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
          ))}
        </div>
        <button
          type="button"
          className="flex h-16 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
          aria-label="Next week"
          onClick={() => scrollBy(1)}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
    </nav>
  )
}
