import { useState } from 'react'
import { InfoIcon, MoonIcon, SunriseIcon, type LucideIcon } from 'lucide-react'
import { Choice, PainScale } from '@/components/pain-scale'
import { WeightInput } from '@/components/weight-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { useCheckIns } from '@/hooks/use-check-ins'
import type { Ask } from '@/lib/check-ins'
import { EVENING_FROM } from '@/lib/check-ins'
import { painBand, painLabel } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { TINGLING_LEVELS, tinglingLabel, tinglingLevelFor } from '@/lib/tingling'
import { cn } from '@/lib/utils'

type CheckInsState = ReturnType<typeof useCheckIns>

function Answer({ label, word, score }: { label: string; word: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} aria-hidden />
      <span className="font-semibold">{word}</span>
    </span>
  )
}

// A check-in once answered: one quiet row, with Edit
function Answered({
  icon: Icon,
  title,
  children,
  onEdit,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  onEdit: () => void
}) {
  return (
    <Card className="animate-fade-in flex-row items-center gap-3 py-2 pr-2 pl-4">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">{children}</span>
      </div>
      <Button variant="ghost" className="h-11 rounded-full px-4 text-primary" onClick={onEdit}>
        Edit
      </Button>
    </Card>
  )
}

// A calm word after a hard answer: what it means for today, never alarming
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function Asking({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card className="animate-fade-in gap-3 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
      {children}
    </Card>
  )
}

// Morning: right arch at the first steps out of bed (the arch measure), whether
// yesterday's run was clean (that needs the morning after), and the weight if he likes.
export function MorningCheckIn({ state, ask, isToday, afternoon = false }: { state: CheckInsState; ask: Ask; isToday: boolean; afternoon?: boolean }) {
  const [open, setOpen] = useState(false) // opened by hand (Edit, or to add the weight)
  const [weightOpen, setWeightOpen] = useState(false)
  const c = state.checkIns
  if (ask === 'none') return null
  if (!c) return <Skeleton className="h-36 rounded-xl bg-card" />

  const cleanPending = c.run != null && c.run.clean == null
  const complete = c.arch != null && !cleanPending
  const sore = isToday && c.arch != null && c.arch >= 5

  const note = sore && (
    <Note>
      {c.arch! >= 7
        ? `Arch ${painLabel(c.arch!)} today: that's the stop zone. Rest it today (no run, no tendon work), and tell your coach.`
        : 'Arch is sore today. Keep it easy, and stop an exercise if it goes above Mild. Your coach decides the next run step.'}
    </Note>
  )

  if (complete && !open)
    return (
      <div className="flex flex-col gap-2">
        <Answered icon={SunriseIcon} title={isToday ? 'This morning' : 'That morning'} onEdit={() => setOpen(true)}>
          <Answer label="Arch" word={painLabel(c.arch!)} score={c.arch!} />
          {c.run && <span className="text-muted-foreground">Run {c.run.clean ? 'clean' : 'not clean'}</span>}
          {c.weight != null && <span className="font-semibold tabular-nums">{c.weight.toFixed(1)} kg</span>}
        </Answered>
        {note}
      </div>
    )

  return (
    <Asking
      title={isToday ? (afternoon ? 'How was the arch this morning?' : 'How’s the arch this morning?') : 'How was the arch that morning?'}
      sub="Right arch, first steps out of bed"
    >
      <PainScale label="Right arch, first steps" hideLabel value={c.arch} onChange={(s) => state.save('arch', s)} />
      {c.run && (
        <div className="flex flex-col gap-1.5">
          <Choice
            label={`Yesterday’s run${c.run.step != null ? ` (step ${c.run.step})` : ''}: clean?`}
            options={[
              { value: 'clean', label: 'Clean' },
              { value: 'not', label: 'Not clean' },
            ]}
            value={c.run.clean == null ? null : c.run.clean ? 'clean' : 'not'}
            onChange={(v) => state.saveClean(v === 'clean')}
          />
          <span className="text-xs text-muted-foreground">
            Clean: None or Mild during the run, and back to normal now.
          </span>
        </div>
      )}
      {note}
      {weightOpen || c.weight != null ? (
        <WeightInput key={c.weight ?? 'none'} value={c.weight} onSave={state.saveWeight} />
      ) : (
        <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setWeightOpen(true)}>
          Add weight
        </Button>
      )}
      {(complete || open) && (
        <Button
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => {
            setOpen(false)
            setWeightOpen(false)
          }}
        >
          Done
        </Button>
      )}
    </Asking>
  )
}

// Evening: neck and hand tingling over the whole day (work, bike, runs, PC)
export function EveningCheckIn({ state, ask, isToday }: { state: CheckInsState; ask: Ask; isToday: boolean }) {
  const [open, setOpen] = useState(false)
  const c = state.checkIns
  if (ask === 'none') return null
  if (!c) return <Skeleton className="h-36 rounded-xl bg-card" />
  const complete = c.neck != null && c.hands != null

  if (ask === 'later' && !open && c.neck == null && c.hands == null)
    return (
      <Card className="flex-row items-center gap-3 py-2 pr-2 pl-4">
        <MoonIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm text-muted-foreground">Evening check-in, from {EVENING_FROM}:00</span>
        <Button variant="ghost" className="h-11 rounded-full px-4 text-primary" onClick={() => setOpen(true)}>
          Answer now
        </Button>
      </Card>
    )

  const hard = isToday && ((c.neck ?? 0) >= 5 || (c.hands ?? 0) >= 5)
  const note = hard && (
    <Note>
      {(c.neck ?? 0) >= 7
        ? `Neck ${painLabel(c.neck!)} today: rest it this evening, and tell your coach now rather than at the weekly check-in.`
        : 'A hard day for the neck and hands. It’s in your log, so your coach sees it at the weekly check-in. If it stays like this, tell your coach sooner.'}
    </Note>
  )

  if (complete && !open)
    return (
      <div className="flex flex-col gap-2">
        <Answered icon={MoonIcon} title={isToday ? 'This evening' : 'That evening'} onEdit={() => setOpen(true)}>
          <Answer label="Neck" word={painLabel(c.neck!)} score={c.neck!} />
          <Answer label="Hands" word={tinglingLabel(c.hands!)} score={c.hands!} />
        </Answered>
        {note}
      </div>
    )

  return (
    <Asking title={isToday ? 'How was today?' : 'How was that day?'} sub="The whole day: work, bike, runs. Not just the exercises.">
      <PainScale label="Neck" value={c.neck} onChange={(s) => state.save('neck', s)} />
      <PainScale
        label="Hands tingling"
        value={c.hands}
        onChange={(s) => state.save('hands', s)}
        levels={TINGLING_LEVELS}
        levelFor={tinglingLevelFor}
      />
      {note}
      {(complete || open) && (
        <Button variant="outline" className="h-11 rounded-full" onClick={() => setOpen(false)}>
          Done
        </Button>
      )}
    </Asking>
  )
}
