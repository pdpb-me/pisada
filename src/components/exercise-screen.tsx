import { CheckIcon, ChevronLeftIcon, XIcon } from 'lucide-react'
import { ExerciseFigure } from '@/components/exercise-figure'
import { Button } from '@/components/ui/button'
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession } from '@/hooks/use-day'
import { cn } from '@/lib/utils'

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>
}

// One exercise, full screen: the figure large, then today's plan, tempo, cues, don'ts, setup.
// "Today's plan" is the session's own instructions (the plan can change); the catalog dose is the fallback.
export function ExerciseScreen({
  session,
  index,
  onBack,
  onIndex,
}: {
  session: DaySession
  index: number
  onBack: () => void
  onIndex: (index: number) => void
}) {
  const slugs = session.exercises.filter((slug) => exerciseFor(slug))
  const ex = exerciseFor(slugs[index] ?? '')
  if (!ex) return null
  const plan = session.instructions?.trim() || ex.dose
  const short = plan.length <= 24
  const last = index >= slugs.length - 1

  return (
    <div className="flex flex-col bg-card pb-28">
      <div className="flex items-center justify-between px-3 pt-3">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Back to the session" onClick={onBack}>
          <ChevronLeftIcon className="size-6" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {index + 1} of {slugs.length} · {session.title}
        </span>
        <span className="size-11" />
      </div>

      <div className="flex flex-col gap-5 px-5 pt-1">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{ex.name}</h1>

        <ExerciseFigure slug={ex.slug} inset className="rounded-2xl bg-muted p-3" />

        {/* A short dose sits big beside the tempo; a long instruction gets the full width */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {ex.tempo && (
            <div className={cn('flex flex-col gap-0.5', !short && 'col-span-2')}>
              <Label>Tempo</Label>
              <span className="text-xl font-bold text-primary">{ex.tempo}</span>
            </div>
          )}
          <div className={cn('flex flex-col gap-0.5', (!short || !ex.tempo) && 'col-span-2', short && ex.tempo && '-order-1')}>
            <Label>Today’s plan</Label>
            <span className={cn(short ? 'text-3xl font-bold tabular-nums' : 'text-base leading-relaxed')}>{plan}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Label>Cues</Label>
          {ex.cues.map((c) => (
            <div key={c} className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2.6} />
              <span className="text-lg font-medium">{c}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Don’t</Label>
          {ex.donts.map((d) => (
            <div key={d} className="flex items-start gap-2.5">
              <XIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2.6} />
              <span className="text-base text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t pt-4">
          <Label>Setup</Label>
          <p className="leading-relaxed">{ex.setup}</p>
        </div>

        {ex.stop && (
          <div className="flex flex-col gap-1.5">
            <Label>Stop</Label>
            <p className="leading-relaxed text-muted-foreground">{ex.stop}</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md gap-2.5 px-4 py-3">
          <Button variant="secondary" className="h-12 flex-1 rounded-full text-base font-semibold" onClick={onBack}>
            Close
          </Button>
          {!last && (
            <Button className="h-12 flex-1 rounded-full text-base font-semibold" onClick={() => onIndex(index + 1)}>
              Next exercise
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
