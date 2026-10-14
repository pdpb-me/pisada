import { useEffect, useState } from 'react'
import { SunriseIcon } from 'lucide-react'
import { toast } from 'sonner'
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
export function MorningCheck({ date }: { date: string }) {
  const { needed, answer, save, run, saveClean } = useMorningCheck(date)
  const [open, setOpen] = useState(false)

  const cleanPending = run != null && run.clean == null
  const complete = answer != null && !cleanPending
  const shouldAutoOpen = needed && !complete && !alreadyAsked(date)
  useEffect(() => {
    if (!shouldAutoOpen) return
    markAsked(date)
    // oxlint-disable-next-line react/set-state-in-effect -- opening once in response to loaded data
    setOpen(true)
  }, [shouldAutoOpen, date])

  if (!needed) return null

  // Close once everything asked is answered
  async function pick(score: number | null) {
    if (await save(score)) {
      if (score != null) toast.success('Saved')
      if (score != null && !cleanPending) setOpen(false)
    }
  }

  async function pickClean(clean: boolean | null) {
    if (await saveClean(clean)) {
      if (clean != null) toast.success('Saved')
      if (clean != null && answer) setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ring-1 ring-foreground/10"
      >
        <SunriseIcon className="size-5 shrink-0 text-muted-foreground" />
        {complete ? (
          <span>
            Right arch this morning:{' '}
            <span className="font-medium">{painLabel(answer.score)}</span>
            {run && (
              <>
                {' · '}yesterday's run:{' '}
                <span className="font-medium">{run.clean ? 'clean' : 'not clean'}</span>
              </>
            )}
          </span>
        ) : (
          <span className="font-medium">
            {answer ? "Was yesterday's run clean?" : "How's the arch this morning?"}
          </span>
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>How's the arch this morning?</DrawerTitle>
              <DrawerDescription>
                Right foot, first steps out of bed. Yesterday had a run or tendon session.
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
            </div>
            <DrawerFooter>
              <Button variant="ghost" className="h-11" onClick={() => setOpen(false)}>
                Later
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
