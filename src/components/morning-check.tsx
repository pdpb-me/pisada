import { useEffect, useState } from 'react'
import { SunriseIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PainScale } from '@/components/pain-scale'
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
  const { needed, answer, save } = useMorningCheck(date)
  const [open, setOpen] = useState(false)

  const shouldAutoOpen = needed && !answer && !alreadyAsked(date)
  useEffect(() => {
    if (!shouldAutoOpen) return
    markAsked(date)
    // oxlint-disable-next-line react/set-state-in-effect -- opening once in response to loaded data
    setOpen(true)
  }, [shouldAutoOpen, date])

  if (!needed) return null

  async function pick(score: number | null) {
    if (await save(score)) {
      if (score != null) toast.success('Saved')
      setOpen(false)
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
        {answer ? (
          <span>
            Right arch this morning:{' '}
            <span className="font-medium">{painLabel(answer.score)}</span>
          </span>
        ) : (
          <span className="font-medium">How's the arch this morning?</span>
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
            <div className="px-4">
              <PainScale label="Right arch, this morning" value={answer?.score ?? null} onChange={pick} />
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
