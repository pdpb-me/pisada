import { useEffect, useRef, useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { Chips, Choice, PainScale } from '@/components/pain-scale'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { DaySession, RunChanges, RunStep, Status, VideoRating } from '@/data/types'
import type { PainArea } from '@/lib/pain-areas'
import { sessionPain, STATUSES } from '@/lib/session-status'
import { RATINGS } from '@/lib/video-ratings'

const NOTE_HINT: Record<string, string> = {
  neck: 'e.g. only the chin nods, short on time',
  tendon: 'e.g. right side shaky on the last set',
  run: 'e.g. calves tight, arch fine',
  pilates: 'e.g. teacher added side planks',
  stability: 'e.g. balance better on the right',
  mobility: 'e.g. skipped the head press',
  hike: 'e.g. steep descent, poles helped',
}

// The details of a logged session, in one bottom sheet: status, pain during, the run's
// ladder step, a word on each video, a note. Taps save at once; the note saves when the sheet closes.
export function LogSheet({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: DaySession
  steps: RunStep[]
  onStatus: (status: Status | null) => Promise<boolean>
  onPain: (area: PainArea, score: number | null) => void
  onRun: (changes: RunChanges) => void
  onRating: (ytId: string, rating: VideoRating | null) => void
  onComment: (comment: string) => Promise<boolean>
  onCleared: () => void
}) {
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{open && <LogForm {...props} onClose={() => onOpenChange(false)} />}</DrawerContent>
    </Drawer>
  )
}

function LogForm({
  session,
  steps,
  onStatus,
  onPain,
  onRun,
  onRating,
  onComment,
  onCleared,
  onClose,
}: {
  session: DaySession
  steps: RunStep[]
  onStatus: (status: Status | null) => Promise<boolean>
  onPain: (area: PainArea, score: number | null) => void
  onRun: (changes: RunChanges) => void
  onRating: (ytId: string, rating: VideoRating | null) => void
  onComment: (comment: string) => Promise<boolean>
  onCleared: () => void
  onClose: () => void
}) {
  const saved = session.log?.comment ?? ''
  const [note, setNote] = useState(saved)
  const [noteOpen, setNoteOpen] = useState(saved !== '')
  const [irritated, setIrritated] = useState(false) // the note then asks what it irritated
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const { area, score } = sessionPain(session)
  const happened = session.log?.status === 'done' || session.log?.status === 'partial'
  const run = session.activity

  // The note saves when the form goes away, however the sheet was closed (Close, swipe,
  // tap outside, back gesture), unless the log was just cleared
  const latest = useRef({ note, saved, logged: !!session.log, onComment, cleared: false })
  useEffect(() => {
    latest.current = { ...latest.current, note, saved, logged: !!session.log, onComment }
  })
  useEffect(
    () => () => {
      const l = latest.current
      if (l.logged && !l.cleared && l.note.trim() !== l.saved) void l.onComment(l.note)
    },
    [],
  )
  const close = onClose

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-xl">{session.title}</DrawerTitle>
        <DrawerDescription>How did it go?</DrawerDescription>
      </DrawerHeader>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4 pb-2">
        <Choice
          label="How much of it"
          hideLabel
          options={STATUSES}
          value={(session.log?.status as Status | undefined) ?? null}
          onChange={(s) => void onStatus(s)}
        />

        {area && (
          <PainScale
            label={area.label}
            hint={happened ? undefined : 'once done or partly'}
            value={score}
            onChange={(s) => onPain(area, s)}
            disabled={!happened}
          />
        )}

        {run && happened && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" id="step-label">
              Ladder step you ran
            </span>
            <Select value={run.run_step == null ? '' : String(run.run_step)} onValueChange={(v) => onRun({ run_step: Number(v) })}>
              <SelectTrigger className="h-11 w-full" aria-labelledby="step-label">
                <SelectValue placeholder="Pick a step" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((s) => (
                  <SelectItem key={s.step} value={String(s.step)} className="min-h-11">
                    Step {s.step} · {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {run.clean == null
                ? 'Clean or not is asked tomorrow morning, once you know how the arch feels.'
                : `Marked ${run.clean ? 'clean' : 'not clean'}.`}
            </span>
            {run.clean != null && (
              <Choice
                label="Clean run?"
                hideLabel
                options={[
                  { value: 'clean', label: 'Clean' },
                  { value: 'not', label: 'Not clean' },
                ]}
                value={run.clean ? 'clean' : 'not'}
                onChange={(v) => onRun({ clean: v === 'clean' })}
              />
            )}
          </div>
        )}

        {happened && session.videos.length > 0 && (
          <div className="flex flex-col gap-4">
            <span className="text-sm font-medium">
              {session.videos.length > 1 ? 'How were the videos?' : 'How was the video?'} <span className="font-normal text-muted-foreground">· optional</span>
            </span>
            {session.videos.map((v) => (
              <Chips
                key={v.yt_id}
                label={v.title}
                options={RATINGS}
                value={session.ratings[v.yt_id] ?? null}
                onChange={(rating) => {
                  onRating(v.yt_id, rating)
                  if (rating !== 'irritated') return
                  // what it irritated goes in the note
                  setIrritated(true)
                  setNoteOpen(true)
                  setTimeout(() => noteRef.current?.focus(), 0)
                }}
              />
            ))}
          </div>
        )}

        {session.log &&
          (noteOpen ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="log-note" className="text-sm font-medium">
                Note <span className="font-normal text-muted-foreground">· optional</span>
              </label>
              <Textarea
                ref={noteRef}
                id="log-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={irritated ? 'What did it irritate?' : (NOTE_HINT[session.kind] ?? 'Anything worth remembering')}
                rows={3}
              />
            </div>
          ) : (
            <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setNoteOpen(true)}>
              Add a note
            </Button>
          ))}

        {session.log && (
          <Button
            variant="ghost"
            className="-mx-2 h-11 self-start px-2 text-muted-foreground"
            onClick={async () => {
              latest.current.cleared = true
              onClose()
              if (await onStatus(null)) onCleared()
            }}
          >
            Clear this log
          </Button>
        )}
      </div>

      <DrawerFooter>
        <Button variant="outline" className="h-12 rounded-full text-base" onClick={close}>
          Close
        </Button>
      </DrawerFooter>
    </div>
  )
}
