import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// Mon-Sun, one dot per planned session. Tap a day to open it.
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
    <nav className="flex items-center gap-1" aria-label="Week">
      <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Previous week" onClick={() => onWeek(-1)}>
        <ChevronLeftIcon />
      </Button>
      <div className="grid flex-1 grid-cols-7">
        {days.map((iso) => {
          const d = new Date(`${iso}T12:00:00`)
          const sessions = dots[iso] ?? []
          const summary = sessions.length
            ? sessions.map((s) => `${s.slot} ${s.status ? STATUS_WORD[s.status] : 'pending'}`).join(', ')
            : 'nothing planned'
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-current={iso === selected ? 'date' : undefined}
              aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${summary}`}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg',
                iso === selected && 'bg-muted',
              )}
            >
              <span className={cn('text-xs text-muted-foreground', iso === today && 'font-semibold text-foreground')}>
                {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </span>
              <span className={cn('text-sm', iso === today && 'font-semibold')}>{d.getDate()}</span>
              <span className="flex h-2 gap-1">
                {sessions.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      'size-2 rounded-full',
                      s.status ? DOT_CLASS[s.status] : 'border border-muted-foreground/50',
                    )}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Next week" onClick={() => onWeek(1)}>
        <ChevronRightIcon />
      </Button>
    </nav>
  )
}
