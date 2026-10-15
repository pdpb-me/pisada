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

// Mon-Sun as day buttons, one dot per planned session. The chosen day is filled;
// today keeps a ring when another day is chosen.
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
  return (
    <nav className="flex items-center gap-0.5" aria-label="Week">
      <button
        type="button"
        className="flex h-16 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
        aria-label="Previous week"
        onClick={() => onWeek(-1)}
      >
        <ChevronLeftIcon className="size-5" />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1">
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
        onClick={() => onWeek(1)}
      >
        <ChevronRightIcon className="size-5" />
      </button>
    </nav>
  )
}
