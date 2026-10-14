import { useState } from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  MinusIcon,
  PlayIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ExerciseDrawer, ExerciseRow, ExerciseThumbnail } from '@/components/exercise-drawer'
import { LogDrawer } from '@/components/log-drawer'
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession, Status, Video } from '@/hooks/use-day'
import type { RunStep } from '@/hooks/use-run-steps'
import { painBand, painLabel, type PainBand } from '@/lib/pain'
import { painAreaFor, type PainArea } from '@/lib/pain-areas'
import { cn } from '@/lib/utils'

// Small status icons instead of coloured blocks
const STATUS_ICON: Record<Status, { icon: typeof CheckIcon; label: string; className: string }> = {
  done: { icon: CheckIcon, label: 'Done', className: 'text-status-done' },
  partial: { icon: CircleDashedIcon, label: 'Partial', className: 'text-status-partial' },
  skipped: { icon: MinusIcon, label: 'Skipped', className: 'text-status-skipped' },
}

const PAIN_DOT: Record<PainBand, string> = {
  low: 'bg-pain-low',
  mid: 'bg-pain-mid',
  high: 'bg-pain-high',
}

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

function capitalise(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function VideoLink({ video }: { video: Video }) {
  return (
    <div className="flex flex-col gap-1">
      {/* Long titles wrap instead of running off the card */}
      <Button
        variant="link"
        asChild
        className="h-auto items-start justify-start gap-2 p-0 text-left whitespace-normal"
      >
        <a
          href={`https://www.youtube.com/watch?v=${video.yt_id}`}
          target="_blank"
          rel="noreferrer"
        >
          <PlayIcon className="mt-0.5" />
          <span>{video.title}</span>
          {video.duration_s != null && (
            <Badge variant="secondary" className="shrink-0">
              {minutes(video.duration_s)}
            </Badge>
          )}
        </a>
      </Button>
      {video.flags && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          {video.flags}
        </p>
      )}
    </div>
  )
}

// The first video as a small 16:9 thumbnail beside the title. Opens YouTube, like the links.
function VideoThumbnail({ video }: { video: Video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.yt_id}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Play ${video.title}`}
      className="block w-28 overflow-hidden rounded-md bg-muted"
    >
      <AspectRatio ratio={16 / 9}>
        {/* hqdefault always exists; it's 4:3 with black bars, which object-cover crops off */}
        <img
          src={`https://i.ytimg.com/vi/${video.yt_id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-background/85 text-foreground">
            <PlayIcon className="ml-0.5 size-3.5 fill-current" />
          </span>
        </span>
      </AspectRatio>
    </a>
  )
}

// One grey line once the session is logged: "✓ Done · Arch ● Mild · Step 3, clean"
function LogSummary({
  session,
  painArea,
  painScore,
}: {
  session: DaySession
  painArea: PainArea | null
  painScore: number | null
}) {
  const log = session.log!
  const status = STATUS_ICON[log.status as Status]
  const run = session.activity
  const Icon = status.icon

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
        <Icon className={cn('size-4 shrink-0', status.className)} />
        <span className="font-medium text-foreground">{status.label}</span>
        {painArea && painScore != null && (
          <>
            <span aria-hidden>·</span>
            <span>{painArea.short}</span>
            <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(painScore)])} />
            <span className="text-foreground">{painLabel(painScore)}</span>
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
      {log.comment && <span className="line-clamp-2 text-muted-foreground">{log.comment}</span>}
    </div>
  )
}

export function SessionCard({
  session,
  onStatus,
  runSteps,
  onPain,
  onRun,
  onComment,
}: {
  session: DaySession
  runSteps: RunStep[]
  onStatus: (status: Status | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onRun: (changes: { run_step?: number; clean?: boolean | null }) => void
  onComment: (comment: string) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  // The exercise shown large; kept while the sheet closes so it doesn't blank out
  const [exSlug, setExSlug] = useState<string | null>(null)
  const [exOpen, setExOpen] = useState(false)
  const showExercise = (slug: string) => {
    setExSlug(slug)
    setExOpen(true)
  }
  const exercises = session.exercises.filter((slug) => exerciseFor(slug)) // unknown slugs show nothing
  const painArea = painAreaFor(session.kind)
  const painScore =
    session.log?.symptoms.find(
      (s) => s.body_area === painArea?.body_area && s.timing === 'during',
    )?.score ?? null

  return (
    <Card>
      <CardHeader className="gap-x-3">
        <CardTitle className="text-lg">{session.title}</CardTitle>
        <Badge variant="outline">{capitalise(session.kind)}</Badge>
        {exercises.length > 0 ? (
          <CardAction>
            <ExerciseThumbnail slug={exercises[0]} onOpen={() => showExercise(exercises[0])} className="w-28" />
          </CardAction>
        ) : (
          session.videos.length > 0 && (
            <CardAction>
              <VideoThumbnail video={session.videos[0]} />
            </CardAction>
          )
        )}
        {session.instructions && (
          <CardDescription className="col-span-full mt-2">{session.instructions}</CardDescription>
        )}
      </CardHeader>

      {(exercises.length > 0 || session.videos.length > 0) && (
        <CardContent className="flex flex-col gap-2">
          {exercises.map((slug) => (
            <ExerciseRow key={slug} slug={slug} onOpen={() => showExercise(slug)} />
          ))}
          {session.videos.map((v) => (
            <VideoLink key={v.yt_id} video={v} />
          ))}
        </CardContent>
      )}

      {session.log ? (
        <CardFooter className="p-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left"
            aria-label={`Edit the log for ${session.title}`}
          >
            <LogSummary session={session} painArea={painArea} painScore={painScore} />
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </CardFooter>
      ) : (
        <CardContent>
          <Button size="lg" className="h-11 w-full" onClick={() => setOpen(true)}>
            Log session
          </Button>
        </CardContent>
      )}

      <LogDrawer
        open={open}
        onOpenChange={setOpen}
        session={session}
        runSteps={runSteps}
        painArea={painArea}
        painScore={painScore}
        onStatus={onStatus}
        onPain={onPain}
        onRun={onRun}
        onComment={onComment}
      />
      <ExerciseDrawer
        slug={exSlug}
        open={exOpen}
        onOpenChange={setExOpen}
        sessionTitle={session.title}
        instructions={session.instructions}
      />
    </Card>
  )
}
