import { useEffect, useState } from 'react'
import { SunriseIcon } from 'lucide-react'
import { toast } from 'sonner'
import { CheckCard } from '@/components/check-card'
import { WeightInput } from '@/components/weight-input'
import { PainScale } from '@/components/pain-scale'
import { CleanToggle } from '@/components/run-log'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useMorningCheck } from '@/hooks/use-morning-check'
import { painLabel } from '@/lib/pain'

const ASKED_KEY = 'pisada:morning-asked'

function alreadyAsked(date: string) {
  try {
    return localStorage.getItem(ASKED_KEY) === date
  } catch {
    return false
  }
}

function markAsked(date: string) {
  try {
    localStorage.setItem(ASKED_KEY, date)
  } catch {
    // Not important: worst case it opens once more
  }
}

// Opens by itself once per morning; after "Later" it stays as a small
// reminder at the top of Today until answered.
export function MorningCheck({ date, isToday }: { date: string; isToday: boolean }) {
  const { answer, save, run, saveClean, weight, saveWeight } = useMorningCheck(date)
  const [open, setOpen] = useState(false)

  const cleanPending = run != null && run.clean == null
  const complete = answer != null && !cleanPending
  const shouldAutoOpen = isToday && !complete && !alreadyAsked(date)
  useEffect(() => {
    if (!shouldAutoOpen) return
    markAsked(date)
    // oxlint-disable-next-line react/set-state-in-effect -- opening once in response to loaded data
    setOpen(true)
  }, [shouldAutoOpen, date])

  // Stays open after a tap, so the weight can be added too; Done closes it
  async function pick(score: number | null) {
    if (await save(score)) {
      if (score != null) toast.success('Saved')
    }
  }

  async function pickClean(clean: boolean | null) {
    if (await saveClean(clean)) {
      if (clean != null) toast.success('Saved')
    }
  }

  return (
    <>
      <CheckCard
        title="Morning"
        icon={SunriseIcon}
        asks={cleanPending && answer ? "Yesterday's run: clean?" : 'Arch, first steps'}
        answers={answer ? [{ label: painLabel(answer.score), score: answer.score }] : []}
        prompt="How's the arch?"
        note={weight != null ? `${weight.toFixed(1)} kg` : null}
        onClick={() => setOpen(true)}
      />

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>This morning</DrawerTitle>
              <DrawerDescription>
                Right arch at the first steps out of bed, and your weight if you like.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-6 px-4">
              <PainScale label="Right arch, this morning" value={answer?.score ?? null} onChange={pick} />
              {run && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Was yesterday's run clean?</span>
                  <CleanToggle value={run.clean} onChange={pickClean} />
                </div>
              )}
              {/* key: a fresh box when the saved value changes */}
              <WeightInput key={weight ?? 'none'} value={weight} onSave={saveWeight} />
            </div>
            <DrawerFooter>
              <Button size="lg" className="h-12 rounded-full text-base" onClick={() => setOpen(false)}>
                {complete ? 'Done' : 'Later'}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
