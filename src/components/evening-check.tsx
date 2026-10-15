import { useEffect, useState } from 'react'
import { MoonIcon } from 'lucide-react'
import { CheckCard } from '@/components/check-card'
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
import { useEveningCheck } from '@/hooks/use-evening-check'
import { painLabel } from '@/lib/pain'
import { TINGLING_LEVELS, tinglingLabel, tinglingLevelFor } from '@/lib/tingling'

const ASKED_KEY = 'pisada:evening-asked'
const OPEN_FROM_HOUR = 19 // the sheet opens by itself once, from 19:00

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

// "How was today?": neck and hand tingling over the whole day. A card on Today
// (and on past days, so a forgotten evening can be filled in the next day);
// the sheet opens by itself once an evening.
export function EveningCheck({ date, isToday }: { date: string; isToday: boolean }) {
  const { answers, save, complete } = useEveningCheck(date)
  const [open, setOpen] = useState(false)
  const [hour] = useState(() => new Date().getHours())

  const shouldAutoOpen = isToday && hour >= OPEN_FROM_HOUR && !complete && !alreadyAsked(date)
  useEffect(() => {
    if (!shouldAutoOpen) return
    markAsked(date)
    // oxlint-disable-next-line react/set-state-in-effect -- opening once, in the evening
    setOpen(true)
  }, [shouldAutoOpen, date])

  const shown = [
    answers.neck && { label: `Neck ${painLabel(answers.neck.score)}`, score: answers.neck.score },
    answers.hands && { label: `Hands ${tinglingLabel(answers.hands.score)}`, score: answers.hands.score },
  ].filter((a): a is { label: string; score: number } => !!a)

  return (
    <>
      <CheckCard
        title="Evening"
        icon={MoonIcon}
        asks="Neck · hands tingling"
        answers={shown}
        prompt={isToday ? 'How was today?' : 'How was that day?'}
        onClick={() => setOpen(true)}
      />

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
            <DrawerHeader>
              <DrawerTitle>{isToday ? 'How was today?' : 'How was that day?'}</DrawerTitle>
              <DrawerDescription>The whole day: work, bike, runs. Not just the exercises.</DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4">
              <PainScale label="Neck" value={answers.neck?.score ?? null} onChange={(s) => save('neck', s)} />
              <PainScale
                label="Hands tingling"
                value={answers.hands?.score ?? null}
                onChange={(s) => save('hands', s)}
                levels={TINGLING_LEVELS}
                levelFor={tinglingLevelFor}
              />
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
