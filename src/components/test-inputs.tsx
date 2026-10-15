import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TestResult } from '@/hooks/use-day'
import { SIDES, type Side, type TestSpec } from '@/lib/tests'

// Left / Right number boxes for a measured test. A value saves when the box loses
// focus (tapping elsewhere or Save); an empty box clears that side.
export function TestInputs({
  spec,
  results,
  onChange,
  disabled,
}: {
  spec: TestSpec
  results: TestResult[]
  onChange: (side: Side, value: number | null) => void
  disabled?: boolean
}) {
  const saved = (side: Side) => {
    const r = results.find((t) => t.test === spec.test && t.side === side)
    return r ? String(r.value) : ''
  }
  const [draft, setDraft] = useState<Record<Side, string>>({ L: saved('L'), R: saved('R') })

  function commit(side: Side) {
    const text = draft[side].trim()
    if (text === saved(side)) return
    const value = text === '' ? null : Number(text)
    if (value != null && (!Number.isFinite(value) || value < 0)) return
    onChange(side, value)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{spec.label}</span>
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map(({ side, label }) => (
          <div key={side} className="flex flex-col gap-1">
            <Label htmlFor={`test-${side}`} className="text-muted-foreground">
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
              disabled={disabled}
              className="h-11 text-lg"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
