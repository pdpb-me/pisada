import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { RunStep } from '@/hooks/use-run-steps'
import { LADDER_RULES, num } from '@/lib/ladder'
import { runStepMinutes } from '@/lib/session-time'
import { cn } from '@/lib/utils'

// One step in three parts: warm-up walk, the run–walk, cool-down walk
export function StepParts({ step }: { step: RunStep }) {
  const parts = [
    { name: 'Warm-up', what: `${num(step.warmup_min)}′ walk` },
    { name: 'Run–walk', what: step.label },
    { name: 'Cool-down', what: `${num(step.cooldown_min)}′ walk` },
  ]
  return (
    <ol className="flex flex-col">
      {parts.map((p) => (
        <li key={p.name} className="flex min-h-11 items-center justify-between gap-3 border-t first:border-t-0">
          <span className="text-sm text-muted-foreground">{p.name}</span>
          <span className="text-right text-[15px] font-semibold">{p.what}</span>
        </li>
      ))}
    </ol>
  )
}

// Every step of the ladder, the current one marked
export function LadderDrawer({
  open,
  onOpenChange,
  steps,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  steps: RunStep[]
  current: number | null
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
          <DrawerHeader>
            <DrawerTitle>Run ladder</DrawerTitle>
            <DrawerDescription>
              Each run: walk to warm up, the run–walk, walk to cool down.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-4">
            {steps.map((s) => {
              const now = s.step === current
              return (
                <div
                  key={s.step}
                  aria-current={now ? 'step' : undefined}
                  className={cn('flex flex-col gap-0.5 rounded-2xl px-3.5 py-3', now ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Step {s.step}</span>
                    {now && <Badge>Now</Badge>}
                  </span>
                  <span className="text-[15px] font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {num(s.warmup_min)}′ walk before, {num(s.cooldown_min)}′ after · {num(s.total_run_min)} min running · ~
                    {Math.round(runStepMinutes(s))} min in all
                  </span>
                </div>
              )
            })}
            <p className="pt-2 pb-1 text-xs text-muted-foreground">{LADDER_RULES}</p>
          </div>
          <DrawerFooter>
            <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
