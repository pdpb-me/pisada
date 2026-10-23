import { useState } from 'react'
import { Choice } from '@/components/pain-scale'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import type { DaySession } from '@/data/types'
import { useWeekDots } from '@/hooks/use-data'
import { addDays, daysBetween } from '@/lib/dates'
import { dayLabel, weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'

// "Plans changed": pick a day (the next 7 as chips, or any date) and morning or evening.
// Runs float and Pilates moves with the teacher; this keeps the plan honest.
export function MoveSheet({
  session,
  today,
  open,
  onOpenChange,
  onMove,
}: {
  session: DaySession
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (date: string, slot: string) => Promise<boolean>
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {open && <MoveForm session={session} today={today} onMove={onMove} onClose={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  )
}

function MoveForm({
  session,
  today,
  onMove,
  onClose,
}: {
  session: DaySession
  today: string
  onMove: (date: string, slot: string) => Promise<boolean>
  onClose: () => void
}) {
  const [date, setDate] = useState(session.date)
  const [slot, setSlot] = useState<'am' | 'pm'>(session.slot === 'am' ? 'am' : 'pm')
  const [moving, setMoving] = useState(false)
  const start = session.date < today ? today : session.date
  const chips = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const changed = date !== session.date || slot !== session.slot

  // Another run within 48 h of the new day? (runs at least 48 h apart)
  const near = useWeekDots(addDays(date, -1), addDays(date, 1)).data ?? {}
  const otherRun =
    session.kind === 'run' &&
    Object.entries(near).find(
      ([d, list]) => list.some((s) => s.kind === 'run' && s.id !== session.id) && Math.abs(daysBetween(d, date)) <= 1,
    )

  async function move() {
    setMoving(true)
    const ok = await onMove(date, slot)
    setMoving(false)
    if (ok) onClose()
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-xl">Move “{session.title}”</DrawerTitle>
        <DrawerDescription>Anything already logged moves with it.</DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-col gap-5 overflow-y-auto px-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Day</legend>
          <div className="grid grid-cols-4 gap-2">
            {chips.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                aria-pressed={d === date}
                className={cn(
                  'flex h-14 flex-col items-center justify-center rounded-lg border text-sm',
                  d === date ? 'border-foreground bg-foreground font-semibold text-background' : 'bg-card',
                )}
              >
                <span className="text-xs">{d === today ? 'Today' : d === addDays(today, 1) ? 'Tmrw' : weekdayShort(d)}</span>
                <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
              </button>
            ))}
            <label
              className={cn(
                'relative flex h-14 flex-col items-center justify-center rounded-lg border text-sm',
                !chips.includes(date) ? 'border-foreground bg-foreground font-semibold text-background' : 'bg-card',
              )}
            >
              <span className="text-xs">{!chips.includes(date) ? weekdayShort(date) : 'Other'}</span>
              <span className="text-base font-semibold">{!chips.includes(date) ? Number(date.slice(8)) : '…'}</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 h-full cursor-pointer opacity-0"
                aria-label="Other date"
              />
            </label>
          </div>
          <span className="text-sm text-muted-foreground">{dayLabel(date)}</span>
        </fieldset>
        <Choice
          label="Time of day"
          options={[
            { value: 'am', label: 'Morning' },
            { value: 'pm', label: 'Evening' },
          ]}
          value={slot}
          onChange={setSlot}
        />
        {otherRun && (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">
            There’s another run on {dayLabel(otherRun[0])}. Runs are best at least 48 hours apart.
          </p>
        )}
      </div>
      <DrawerFooter>
        <Button className="h-12 rounded-full text-base" onClick={move} disabled={!changed || moving}>
          {moving ? 'Moving…' : changed ? `Move to ${dayLabel(date)}` : 'Pick a new day or time'}
        </Button>
      </DrawerFooter>
    </div>
  )
}
