import { CheckIcon, ChevronRightIcon, MinusIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { LogSummary } from '@/components/log-summary'
import type { DaySession } from '@/hooks/use-day'
import { exerciseFor } from '@/exercises/catalog'
import { testFor } from '@/lib/tests'
import { cn } from '@/lib/utils'

const SLOT_WORD: Record<string, string> = { am: 'Morning', pm: 'Evening' }

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// What the row says under the title before the session is logged
function meta(s: DaySession) {
  if (s.kind === 'pilates') return 'Class with your teacher'
  const test = testFor(s.exercises)
  if (test) return `Test · ${test.label.toLowerCase()}`
  const exercises = s.exercises.filter((slug) => exerciseFor(slug)).length
  const parts = [exercises > 0 && plural(exercises, 'exercise'), s.videos.length > 0 && plural(s.videos.length, 'video')]
  const text = parts.filter(Boolean).join(' + ')
  return text || (s.instructions ?? '')
}

function StatusMark({ status }: { status: string | null | undefined }) {
  const base = 'flex size-8 shrink-0 items-center justify-center rounded-full'
  if (status === 'done')
    return (
      <span className={cn(base, 'bg-status-done text-primary-foreground')}>
        <CheckIcon className="size-4" strokeWidth={3} />
      </span>
    )
  if (status === 'partial')
    return (
      <span className={cn(base, 'bg-status-partial text-primary-foreground')}>
        <CheckIcon className="size-4" strokeWidth={3} />
      </span>
    )
  if (status === 'skipped')
    return (
      <span className={cn(base, 'bg-muted text-muted-foreground')}>
        <MinusIcon className="size-4" strokeWidth={3} />
      </span>
    )
  return <span className={cn(base, 'ring-2 ring-border ring-inset')} />
}

// The day at a glance: one row per planned session. A row opens the session screen.
export function PlanCard({ sessions, onOpen }: { sessions: DaySession[]; onOpen: (id: string) => void }) {
  const done = sessions.filter((s) => s.log?.status === 'done' || s.log?.status === 'partial').length

  return (
    <Card className="gap-0 py-2">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <h2 className="text-lg font-semibold">{sessions.length ? 'Today’s plan' : 'Nothing planned'}</h2>
        {sessions.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {done} of {sessions.length} done
          </span>
        )}
      </div>
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen(s.id)}
          className="flex min-h-16 items-center gap-3 border-t px-4 py-3 text-left first-of-type:border-t-0 hover:bg-muted/50"
        >
          <StatusMark status={s.log?.status} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {SLOT_WORD[s.slot] ?? s.slot} · {s.kind}
            </span>
            <span className={cn('text-base font-semibold', s.log && 'text-muted-foreground')}>{s.title}</span>
            {s.log ? (
              <LogSummary session={s} showComment={false} />
            ) : (
              <span className="line-clamp-1 text-sm text-muted-foreground">{meta(s)}</span>
            )}
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </Card>
  )
}
