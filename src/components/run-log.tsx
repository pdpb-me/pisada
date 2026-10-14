import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Activity } from '@/hooks/use-day'
import type { RunStep } from '@/hooks/use-run-steps'

function num(n: number) {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

// Clean yes/no as two buttons that can both be off: often you only know the
// next morning, and the morning check-in asks again if it's still unset.
export function CleanToggle({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (clean: boolean | null) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value == null ? '' : value ? 'clean' : 'niggle'}
      onValueChange={(v) => onChange(v === '' ? null : v === 'clean')}
      className="w-full"
      aria-label="Clean run?"
    >
      <ToggleGroupItem value="clean" className="h-11 flex-1 data-[state=on]:bg-muted">
        Clean
      </ToggleGroupItem>
      <ToggleGroupItem value="niggle" className="h-11 flex-1 data-[state=on]:bg-muted">
        Not clean
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function RunLog({
  activity,
  steps,
  onChange,
}: {
  activity: Activity
  steps: RunStep[]
  onChange: (changes: { run_step?: number; clean?: boolean | null }) => void
}) {
  const current = steps.find((s) => s.step === activity.run_step)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Ladder step</span>
        <Select
          value={activity.run_step == null ? '' : String(activity.run_step)}
          onValueChange={(v) => onChange({ run_step: Number(v) })}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Pick a step" />
          </SelectTrigger>
          <SelectContent>
            {steps.map((s) => (
              <SelectItem key={s.step} value={String(s.step)} className="min-h-11">
                Step {s.step} — {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {current && (
          <p className="text-xs text-muted-foreground">
            {num(current.warmup_min)}′ walk, then {current.label}, then{' '}
            {num(current.cooldown_min)}′ walk · {num(current.total_run_min)} min running
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Clean run?</span>
        <CleanToggle value={activity.clean} onChange={(clean) => onChange({ clean })} />
        <p className="text-xs text-muted-foreground">
          Clean = no arch niggle, or ≤ 3/10 during that's back to baseline next morning.
          Up a step after 2 clean runs in a row; a niggle that lingers holds the step;
          over 3/10 drops one. Decided at the weekly check-in.
        </p>
      </div>
    </div>
  )
}
