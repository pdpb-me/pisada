import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, TriangleAlertIcon } from 'lucide-react'
import { ExerciseFigure } from '@/components/exercise-figure'
import { LogDrawer } from '@/components/log-drawer'
import { LogSummary } from '@/components/log-summary'
import { sessionPain } from '@/lib/session-status'
import { MoveSession } from '@/components/move-session'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession, Status, Video } from '@/hooks/use-day'
import type { RunStep } from '@/hooks/use-run-steps'
import type { PainArea } from '@/lib/pain-areas'
import type { Side, TestSpec } from '@/lib/tests'

export type SessionHandlers = {
  onStatus: (status: Status | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onRun: (changes: { run_step?: number; clean?: boolean | null }) => void
  onComment: (comment: string) => Promise<boolean>
  onTest: (spec: TestSpec, side: Side, value: number | null) => void
  onMove: (date: string, slot: string) => Promise<boolean>
}

const SLOT_WORD: Record<string, string> = { am: 'Morning', pm: 'Evening' }

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

function VideoRow({ video }: { video: Video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.yt_id}`}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-20 items-center gap-3 border-t py-3 first:border-t-0"
    >
      <span className="relative block h-[54px] w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {/* mqdefault is 16:9 with no black bars */}
        <img
          src={`https://i.ytimg.com/vi/${video.yt_id}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground">
            <PlayIcon className="ml-0.5 size-3.5 fill-current" />
          </span>
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{video.title}</span>
        <span className="text-sm text-muted-foreground">
          Video{video.duration_s != null && ` · ${minutes(video.duration_s)}`} · YouTube
        </span>
        {video.flags && (
          <span className="flex gap-1.5 text-xs text-muted-foreground">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {video.flags}
          </span>
        )}
      </span>
    </a>
  )
}

// One session: what to do (drawings, videos), then Log and Move at the bottom.
export function SessionScreen({
  session,
  runSteps,
  handlers,
  onBack,
  onOpenExercise,
}: {
  session: DaySession
  runSteps: RunStep[]
  handlers: SessionHandlers
  onBack: () => void
  onOpenExercise: (index: number) => void
}) {
  const [logOpen, setLogOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const exercises = session.exercises.filter((slug) => exerciseFor(slug))
  const { area, score } = sessionPain(session)

  return (
    <div className="flex flex-col pb-44">
      <header className="flex flex-col gap-2 border-b bg-card px-3 pt-3 pb-4">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Back to the day" onClick={onBack}>
          <ChevronLeftIcon className="size-6" />
        </Button>
        <div className="flex flex-col gap-1 px-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {SLOT_WORD[session.slot] ?? session.slot} · {session.kind}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
          {session.instructions && <p className="text-sm leading-relaxed text-muted-foreground">{session.instructions}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {(exercises.length > 0 || session.videos.length > 0) && (
          <Card className="gap-0 px-4 py-1">
            {exercises.map((slug, i) => {
              const ex = exerciseFor(slug)!
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => onOpenExercise(i)}
                  className="flex min-h-21 items-center gap-3 border-t py-3 text-left first:border-t-0"
                >
                  <span className="block h-[68px] w-24 shrink-0 overflow-hidden rounded-xl bg-muted p-1">
                    <ExerciseFigure slug={slug} contain className="size-full" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{ex.name}</span>
                    {ex.tempo && <span className="text-sm text-muted-foreground">{ex.tempo}</span>}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
            {session.videos.map((v) => (
              <VideoRow key={v.yt_id} video={v} />
            ))}
          </Card>
        )}

        {exercises.length > 0 && (
          <Button variant="outline" className="h-12 rounded-full text-base font-semibold text-primary" onClick={() => onOpenExercise(0)}>
            <PlayIcon className="fill-current" />
            Start: one exercise at a time
          </Button>
        )}
      </div>

      {/* Thumb zone: log and move */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md flex-col gap-1 px-4 pt-3 pb-3">
          {session.log ? (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="flex min-h-12 items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-left"
              aria-label={`Edit the log for ${session.title}`}
            >
              <LogSummary session={session} />
              <span className="text-sm font-medium text-primary">Edit</span>
            </button>
          ) : (
            <Button className="h-12 rounded-full text-base font-semibold" onClick={() => setLogOpen(true)}>
              Log session
            </Button>
          )}
          <Button variant="ghost" className="h-11 text-muted-foreground" onClick={() => setMoveOpen(true)}>
            Move to another day
          </Button>
        </div>
      </div>

      <LogDrawer
        open={logOpen}
        onOpenChange={setLogOpen}
        session={session}
        runSteps={runSteps}
        painArea={area}
        painScore={score}
        onStatus={handlers.onStatus}
        onPain={handlers.onPain}
        onRun={handlers.onRun}
        onComment={handlers.onComment}
        onTest={handlers.onTest}
      />

      <Drawer open={moveOpen} onOpenChange={setMoveOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md pb-6">
            <DrawerHeader>
              <DrawerTitle>Move “{session.title}”</DrawerTitle>
              <DrawerDescription>Anything already logged moves with it.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <MoveSession
                session={session}
                onMove={async (date, slot) => {
                  const ok = await handlers.onMove(date, slot)
                  if (ok) {
                    setMoveOpen(false)
                    onBack() // it has left this day
                  }
                  return ok
                }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
