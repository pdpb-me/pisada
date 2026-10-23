import type { DaySession } from '@/data/types'
import { duration, km } from '@/lib/format'
import { painBand, painLabel } from '@/lib/pain'
import { PAIN_DOT, sessionPain, statusLabel } from '@/lib/session-status'
import { SIDES, testFor } from '@/lib/tests'
import { cn } from '@/lib/utils'

const dot = '·'

// What was logged, in one short line: "Arch ● Mild · L 22 · R 15 reps · Step 3, clean · 33 min · 4.7 km".
// compact (in the day's plan): the status shows in the round mark, so the word is left out,
// and a missing pain answer gets a gentle "add" hint.
export function LogSummary({ session, compact = false }: { session: DaySession; compact?: boolean }) {
  const log = session.log!
  const run = session.activity
  const { area, score } = sessionPain(session)
  const spec = testFor(session.exercises)
  const sides = spec
    ? SIDES.flatMap(({ side }) => {
        const r = session.tests.find((t) => t.test === spec.test && t.side === side)
        return r ? [`${side} ${r.value}`] : []
      })
    : []
  const happened = log.status !== 'skipped'
  const parts: React.ReactNode[] = []
  if (!compact)
    parts.push(
      <span key="s" className="font-semibold text-foreground">
        {statusLabel(log.status)}
      </span>,
    )
  if (area && score != null)
    parts.push(
      <span key="p" className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {area.short}
        <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} aria-hidden />
        <span className="text-foreground">{painLabel(score)}</span>
      </span>,
    )
  if (spec && sides.length)
    parts.push(<span key="t" className="whitespace-nowrap text-foreground">{`${sides.join(' · ')} ${spec.unit}`}</span>)
  if (run?.run_step != null)
    parts.push(
      <span key="r" className="whitespace-nowrap">
        Step {run.run_step}
        {run.clean != null && (run.clean ? ', clean' : ', not clean')}
      </span>,
    )
  if (session.watch)
    parts.push(
      <span key="w" className="whitespace-nowrap">
        {[duration(session.watch.duration_s), session.watch.distance_m ? km(session.watch.distance_m) : null].filter(Boolean).join(' · ')}
      </span>,
    )

  const needsPain = compact && happened && area && score == null
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {(parts.length > 0 || needsPain) && (
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
          {parts.flatMap((p, i) =>
            i
              ? [
                  <span key={`d${i}`} aria-hidden>
                    {dot}
                  </span>,
                  p,
                ]
              : [p],
          )}
          {needsPain && (
            <>
              {parts.length > 0 && <span aria-hidden>{dot}</span>}
              <span className="text-primary">Add {area!.short.toLowerCase()} pain</span>
            </>
          )}
        </span>
      )}
      {log.comment && <span className="line-clamp-1 text-sm text-muted-foreground italic">“{log.comment}”</span>}
      {compact && !parts.length && !needsPain && !log.comment && (
        <span className="text-sm text-muted-foreground">{statusLabel(log.status)}</span>
      )}
    </span>
  )
}
