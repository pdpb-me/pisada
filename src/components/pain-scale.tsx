import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PAIN_LEVELS, painLevelFor, type PainBand } from '@/lib/pain'
import { cn } from '@/lib/utils'

// Unselected: neutral outline. Only the chosen word gets its colour. The word is always shown.
const BAND_CLASS: Record<PainBand, string> = {
  low: 'data-[state=on]:bg-pain-low data-[state=on]:text-pain-low-foreground',
  mid: 'data-[state=on]:bg-pain-mid data-[state=on]:text-pain-mid-foreground',
  high: 'data-[state=on]:bg-pain-high data-[state=on]:text-pain-high-foreground',
}

export function PainScale({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number | null
  onChange: (score: number | null) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        value={value == null ? '' : String(painLevelFor(value))}
        onValueChange={(v) => onChange(v === '' ? null : Number(v))}
        disabled={disabled}
        className="flex w-full"
        aria-label={label}
      >
        {PAIN_LEVELS.map((l) => (
          <ToggleGroupItem
            key={l.score}
            value={String(l.score)}
            className={cn(
              'h-11 min-w-11 flex-auto px-1.5 text-xs text-foreground hover:text-foreground data-[state=on]:border-transparent data-[state=on]:font-semibold',
              BAND_CLASS[l.band],
            )}
          >
            {l.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
