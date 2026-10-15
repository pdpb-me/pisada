import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DaySession } from '@/hooks/use-day'

// "Plans changed": pick a new day and Morning/Evening, then Move.
// Runs float and Pilates moves with the teacher; this keeps the plan honest.
export function MoveSession({
  session,
  onMove,
}: {
  session: DaySession
  onMove: (date: string, slot: string) => Promise<boolean>
}) {
  const [date, setDate] = useState(session.date)
  const [slot, setSlot] = useState(session.slot)
  const [moving, setMoving] = useState(false)
  const changed = date !== session.date || slot !== session.slot

  async function move() {
    setMoving(true)
    await onMove(date, slot)
    setMoving(false)
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">Move to another day</span>
      <div className="flex gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-11 flex-1"
          aria-label="New date"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={slot}
          onValueChange={(v) => v && setSlot(v)}
          aria-label="Morning or evening"
        >
          <ToggleGroupItem value="am" className="h-11 px-3 data-[state=on]:bg-muted">
            AM
          </ToggleGroupItem>
          <ToggleGroupItem value="pm" className="h-11 px-3 data-[state=on]:bg-muted">
            PM
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button variant="outline" className="h-11" onClick={move} disabled={!changed || moving}>
        {moving ? 'Moving…' : 'Move'}
      </Button>
    </div>
  )
}
