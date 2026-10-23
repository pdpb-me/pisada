import { liftWord, MIN_ANSWERED, type Factor, type FactorResult } from '@/lib/factors'
import type { AreaId } from '@/lib/trends'

const AREA_WORD: Record<AreaId, { name: string; day: string }> = {
  arch: { name: 'Arch', day: 'mornings' },
  neck: { name: 'Neck', day: 'days' },
  hands: { name: 'Hands', day: 'days' },
}

function Sentence({ area, f, bad }: { area: AreaId; f: Factor; bad: string }) {
  const w = AREA_WORD[area]
  return (
    <p className="text-sm">
      {w.name} {bad} on{' '}
      <b className="font-semibold">
        {f.with.bad} of {f.with.of}
      </b>{' '}
      {w.day} with “{f.label.toLowerCase()}”, and on{' '}
      <b className="font-semibold">
        {f.without.bad} of {f.without.of}
      </b>{' '}
      without.
    </p>
  )
}

function Bar({ label, n, of }: { label: string; n: number; of: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-14">{label}</span>
      <span className="h-1.5 flex-1 rounded-full bg-muted">
        <span className="block h-1.5 rounded-full bg-foreground/70" style={{ width: `${of ? (n / of) * 100 : 0}%` }} />
      </span>
      <span className="w-9 text-right tabular-nums">{of ? Math.round((n / of) * 100) : 0}%</span>
    </div>
  )
}

// "What goes with a bad day", as a ranked list: plain counts, each in one sentence
export function FactorsList({ area, result, limit }: { area: AreaId; result: FactorResult; limit?: number }) {
  if (!result.enough)
    return (
      <p className="text-sm text-muted-foreground">
        Shown once there are {MIN_ANSWERED} answers in this range ({result.answered} so far). Then it compares days with and without each
        thing.
      </p>
    )
  const shown = result.factors.slice(0, limit)
  if (!shown.length) return <p className="text-sm text-muted-foreground">Not enough days with and without each thing yet.</p>
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        From {result.answered} answers. Small numbers: a hint to talk about with your coach, not a rule. Watch data counts once it has synced.
      </p>
      {shown.map((f) => (
        <div key={f.id} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold">{f.label}</span>
            <span className="text-sm text-muted-foreground">{liftWord(f)}</span>
          </span>
          <Sentence area={area} f={f} bad={result.bad === 'tingled' ? 'tingled' : `was ${result.bad}`} />
          <Bar label="With" n={f.with.bad} of={f.with.of} />
          <Bar label="Without" n={f.without.bad} of={f.without.of} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        From {result.answered} answers. Small numbers: a hint to talk about with your coach, not a rule. Watch data counts once it has
        synced.
      </p>
    </div>
  )
}
