import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { PainScale } from '@/components/pain-scale'
import { RunLog } from '@/components/run-log'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DaySession, Status } from '@/hooks/use-day'
import type { RunStep } from '@/hooks/use-run-steps'
import type { PainArea } from '@/lib/pain-areas'

const STATUSES: { value: Status; label: string }[] = [
  { value: 'done', label: 'Done' },
  { value: 'partial', label: 'Partial' },
  { value: 'skipped', label: 'Skipped' },
]

type LogProps = {
  session: DaySession
  runSteps: RunStep[]
  painArea: PainArea | null
  painScore: number | null
  onStatus: (status: Status | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onRun: (changes: { run_step?: number; clean?: boolean | null }) => void
  onComment: (comment: string) => Promise<boolean>
}

// Everything you log about one session, in one bottom sheet. Taps save
// straight away (like the morning check-in); Save stores the comment and closes.
export function LogDrawer({
  open,
  onOpenChange,
  ...props
}: LogProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <LogForm {...props} onClose={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  )
}

// Mounted each time the drawer opens, so the comment draft starts fresh.
function LogForm({
  session,
  runSteps,
  painArea,
  painScore,
  onStatus,
  onPain,
  onRun,
  onComment,
  onClose,
}: LogProps & { onClose: () => void }) {
  const comment = session.log?.comment ?? ''
  const [draft, setDraft] = useState(comment)
  const [saving, setSaving] = useState(false)
  const skipped = session.log?.status === 'skipped'

  async function save() {
    if (session.log && draft.trim() !== comment) {
      setSaving(true)
      const ok = await onComment(draft)
      setSaving(false)
      if (!ok) return
    }
    onClose()
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader>
        <DrawerTitle>{session.title}</DrawerTitle>
        <DrawerDescription>How did it go?</DrawerDescription>
      </DrawerHeader>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={session.log?.status ?? ''}
          onValueChange={(v) => onStatus((v || null) as Status | null)}
          className="w-full"
          aria-label="How much of it did you do?"
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

        {painArea && session.log && !skipped && (
          <PainScale
            label={painArea.label}
            value={painScore}
            onChange={(score) => onPain(painArea, score)}
            disabled={!session.log.id}
          />
        )}

        {session.activity && !skipped && (
          <RunLog activity={session.activity} steps={runSteps} onChange={onRun} />
        )}

        {session.log && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Comment (optional)</span>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. arch tight on the last set, eased after"
              rows={3}
            />
          </div>
        )}
      </div>

      <DrawerFooter>
        <Button size="lg" className="h-11" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DrawerFooter>
    </div>
  )
}
