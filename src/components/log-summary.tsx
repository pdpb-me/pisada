import type { DaySession, Status } from '@/hooks/use-day'
import { PAIN_DOT, STATUS_ICON, sessionPain } from '@/lib/session-status'
import { painBand, painLabel } from '@/lib/pain'
import { SIDES, testFor } from '@/lib/tests'
import { cn } from '@/lib/utils'

// One grey line once the session is logged: "✓ Done · Arch ● Mild · L 18 · R 15 reps · Step 3, clean"
export function LogSummary({ session, showComment = true }: { session: DaySession; showComment?: boolean }) {
  const log = session.log!
  const status = STATUS_ICON[log.status as Status]
  const run = session.activity
  const { area, score } = sessionPain(session)
  const spec = testFor(session.exercises)
  const sides = spec
    ? SIDES.flatMap(({ side }) => {
        const r = session.tests.find((t) => t.test === spec.test && t.side === side)
        return r ? [`${side} ${r.value}`] : []
      })
    : []
  const testResults = spec && sides.length > 0 ? `${sides.join(' · ')} ${spec.unit}` : null
  const Icon = status.icon

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <Icon className={cn('size-4 shrink-0', status.className)} />
        <span className="font-medium text-foreground">{status.label}</span>
        {area && score != null && (
          <>
            <span aria-hidden>·</span>
            <span>{area.short}</span>
            <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} />
            <span className="text-foreground">{painLabel(score)}</span>
          </>
        )}
        {testResults && (
          <>
            <span aria-hidden>·</span>
            <span className="text-foreground">{testResults}</span>
          </>
        )}
        {run?.run_step != null && (
          <>
            <span aria-hidden>·</span>
            <span>
              Step {run.run_step}
              {run.clean != null && (run.clean ? ', clean' : ', not clean')}
            </span>
          </>
        )}
      </span>
      {showComment && log.comment && (
        <span className="line-clamp-2 text-sm text-muted-foreground">{log.comment}</span>
      )}
    </div>
  )
}
