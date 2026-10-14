import { useState } from 'react'
import { MessageSquareIcon, PlayIcon, TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { PainScale } from '@/components/pain-scale'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DaySession, Status, Video } from '@/hooks/use-day'
import { painAreaFor, type PainArea } from '@/lib/pain-areas'

const STATUSES: { value: Status; label: string }[] = [
  { value: 'done', label: 'Done' },
  { value: 'partial', label: 'Partial' },
  { value: 'skipped', label: 'Skipped' },
]

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

function VideoLink({ video }: { video: Video }) {
  return (
    <div className="flex flex-col gap-1">
      <Button variant="link" asChild className="h-auto justify-start gap-2 p-0">
        <a
          href={`https://www.youtube.com/watch?v=${video.yt_id}`}
          target="_blank"
          rel="noreferrer"
        >
          <PlayIcon />
          {video.title}
          {video.duration_s != null && (
            <Badge variant="secondary">{minutes(video.duration_s)}</Badge>
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

export function SessionCard({
  session,
  onStatus,
  onPain,
  onComment,
}: {
  session: DaySession
  onStatus: (status: Status | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onComment: (comment: string) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const comment = session.log?.comment
  const painArea = painAreaFor(session.kind)
  const showPain = painArea && session.log && session.log.status !== 'skipped'
  const painScore =
    session.log?.symptoms.find(
      (s) => s.body_area === painArea?.body_area && s.timing === 'during',
    )?.score ?? null

  function openComment() {
    setDraft(comment ?? '')
    setOpen(true)
  }

  async function saveComment() {
    setSaving(true)
    const ok = await onComment(draft)
    setSaving(false)
    if (ok) setOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {session.slot} · {session.kind}
        </span>
        <CardTitle className="text-lg">{session.title}</CardTitle>
        {session.instructions && (
          <CardDescription>{session.instructions}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {session.videos.length > 0 && (
          <div className="flex flex-col gap-2">
            {session.videos.map((v) => (
              <VideoLink key={v.yt_id} video={v} />
            ))}
          </div>
        )}

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={session.log?.status ?? ''}
          onValueChange={(v) => onStatus((v || null) as Status | null)}
          className="w-full"
        >
          {STATUSES.map((s) => (
            <ToggleGroupItem
              key={s.value}
              value={s.value}
              className="h-11 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {showPain && (
          <PainScale
            label={painArea.label}
            value={painScore}
            onChange={(score) => onPain(painArea, score)}
            disabled={!session.log?.id}
          />
        )}

        {session.log && (
          <button
            type="button"
            onClick={openComment}
            className="flex min-h-11 items-start gap-2 rounded-md text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <MessageSquareIcon className="mt-0.5 size-4 shrink-0" />
            {comment ? (
              <span className="text-foreground">{comment}</span>
            ) : (
              <span>Add a comment</span>
            )}
          </button>
        )}
      </CardContent>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>{session.title}</DrawerTitle>
              <DrawerDescription>How did it go?</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. arch tight on the last set, eased after"
                rows={4}
                autoFocus
              />
            </div>
            <DrawerFooter>
              <Button size="lg" className="h-11" onClick={saveComment} disabled={saving}>
                {saving ? 'Saving…' : 'Save comment'}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  )
}
