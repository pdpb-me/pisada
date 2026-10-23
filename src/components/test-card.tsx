import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TestResult } from '@/data/types'
import { useTestResults } from '@/hooks/use-data'
import { dayMonth } from '@/lib/format'
import { rightOfLeft, SIDES, testDays, type Side, type TestDay, type TestSpec } from '@/lib/tests'

// The heel-raise test on its own session screen: Left / Right boxes, with last time's
// numbers beside them. A box saves when it loses focus (or with Enter); empty clears it.
export function TestCard({
  spec,
  results,
  planSessionId,
  onChange,
}: {
  spec: TestSpec
  results: TestResult[]
  planSessionId: string
  onChange: (side: Side, value: number | null) => void
}) {
  const history = testDays((useTestResults(spec.test).data ?? []).filter((r) => r.plan_session_id !== planSessionId))
  const last = history[history.length - 1]
  const saved = (side: Side) => {
    const r = results.find((t) => t.test === spec.test && t.side === side)
    return r ? String(r.value) : ''
  }
  const [draft, setDraft] = useState<Record<Side, string>>({ L: saved('L'), R: saved('R') })
  const [historyOpen, setHistoryOpen] = useState(false)

  function commit(side: Side) {
    const text = draft[side].trim()
    if (text === saved(side)) return
    const value = text === '' ? null : Number(text)
    if (value != null && (!Number.isInteger(value) || value < 0 || value > 200)) return
    onChange(side, value)
  }

  return (
    <Card className="gap-4 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Your result</h2>
        <p className="text-sm text-muted-foreground">Clean reps on one leg, left first. Stop if the arch goes above Mild.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map(({ side, label }) => (
          <div key={side} className="flex flex-col gap-1.5">
            <Label htmlFor={`test-${side}`} className="text-sm">
              {label}
            </Label>
            <Input
              id={`test-${side}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={spec.unit}
              value={draft[side]}
              onChange={(e) => setDraft((d) => ({ ...d, [side]: e.target.value }))}
              onBlur={() => commit(side)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="h-12 text-xl font-semibold tabular-nums"
            />
            <span className="text-xs text-muted-foreground">
              {last?.[side] != null ? `Last time: ${last[side]} (${dayMonth(last.date)})` : 'First time'}
            </span>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setHistoryOpen(true)}>
          See every test
        </Button>
      )}
      <TestHistory days={history} open={historyOpen} onOpenChange={setHistoryOpen} />
    </Card>
  )
}

// Every test so far, newest first: left, right, and the right as a share of the left
export function TestHistory({ days, open, onOpenChange }: { days: TestDay[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.L ?? 0, d.R ?? 0]))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">Heel-raise tests</DrawerTitle>
            <DrawerDescription>Clean reps on one leg. The right is the sore side: 100% means both sides alike.</DrawerDescription>
          </DrawerHeader>
          <ol className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4">
            {[...days].reverse().map((d) => (
              <li key={d.date} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{dayMonth(d.date)}</span>
                  {rightOfLeft(d) != null && <span className="text-sm text-muted-foreground">Right is {rightOfLeft(d)}% of left</span>}
                </div>
                {(['L', 'R'] as const).map((side) => (
                  <div key={side} className="flex items-center gap-2 text-sm">
                    <span className="w-10 text-muted-foreground">{side === 'L' ? 'Left' : 'Right'}</span>
                    <span className="h-2 flex-1 rounded-full bg-muted">
                      <span className="block h-2 rounded-full bg-foreground/70" style={{ width: `${((d[side] ?? 0) / max) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-semibold tabular-nums">{d[side] ?? '–'}</span>
                  </div>
                ))}
              </li>
            ))}
          </ol>
          <DrawerFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
