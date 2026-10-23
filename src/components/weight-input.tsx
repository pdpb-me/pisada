import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Optional morning weight (kg). Saves when the box loses focus; empty removes the day's value.
// Accepts "72.4" or "72,4".
export function WeightInput({ value, onSave }: { value: number | null; onSave: (kg: number | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value != null ? value.toFixed(1) : '')

  const [invalid, setInvalid] = useState(false)

  function commit() {
    const text = draft.trim().replace(',', '.')
    setInvalid(false)
    if (text === (value != null ? value.toFixed(1) : '')) return
    if (text === '') return void onSave(null)
    const kg = Number(text)
    if (!Number.isFinite(kg) || kg < 30 || kg > 250) return setInvalid(true)
    onSave(Math.round(kg * 10) / 10)
  }

  // Still being typed in when the card goes away: save it too
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="morning-weight" className="text-sm font-medium">
        Weight <span className="font-normal text-muted-foreground">· optional</span>
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="morning-weight"
          inputMode="decimal"
          placeholder="e.g. 72.4"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-11 max-w-32 text-base tabular-nums"
        />
        <span className="text-muted-foreground">kg</span>
      </div>
      {invalid && <span className="text-xs font-medium text-destructive">Not saved: kg between 30 and 250, e.g. 72.4</span>}
      <span className="text-xs text-muted-foreground">After the toilet, before drinking or eating. A few times a week is enough.</span>
    </div>
  )
}
