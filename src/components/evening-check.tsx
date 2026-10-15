import { useEffect, useState } from 'react'
import { MoonIcon } from 'lucide-react'
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
const SHOW_FROM_HOUR = 17 // the reminder row appears on Today from 17:00
const OPEN_FROM_HOUR = 19 // and the sheet opens by itself once, from 19:00

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

// "How was today?": arch, neck and hand tingling over the whole day. On today it
// shows from the late afternoon; on past days (via the week strip) it's always there,
// so a forgotten evening can be filled in the next day.
export function EveningCheck({ date, isToday }: { date: string; isToday: boolean }) {
  const { answers, save, complete } = useEveningCheck(date)
  const [open, setOpen] = useState(false)
  const [hour] = useState(() => new Date().getHours())

  const visible = !isToday || hour >= SHOW_FROM_HOUR
  const shouldAutoOpen = isToday && hour >= OPEN_FROM_HOUR && !complete && !alreadyAsked(date)
  useEffect(() => {
    if (!shouldAutoOpen) return
    markAsked(date)
    // oxlint-disable-next-line react/set-state-in-effect -- opening once, in the evening
    setOpen(true)
  }, [shouldAutoOpen, date])

  if (!visible) return null

  const summary = [
    answers.arch && `arch ${painLabel(answers.arch.score)}`,
    answers.neck && `neck ${painLabel(answers.neck.score)}`,
    answers.hands && `tingling ${tinglingLabel(answers.hands.score)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ring-1 ring-foreground/10"
      >
        <MoonIcon className="size-5 shrink-0 text-muted-foreground" />
        {summary ? (
          <span>
            {isToday ? 'Today' : 'That day'}: <span className="font-medium">{summary}</span>
          </span>
        ) : (
          <span className="font-medium">{isToday ? 'How was today?' : 'How was that day?'}</span>
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
            <DrawerHeader>
              <DrawerTitle>{isToday ? 'How was today?' : 'How was that day?'}</DrawerTitle>
              <DrawerDescription>The whole day, not just the exercises: work, bike, runs.</DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4">
              <PainScale label="Right arch" value={answers.arch?.score ?? null} onChange={(s) => save('arch', s)} />
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
              <Button size="lg" className="h-11" onClick={() => setOpen(false)}>
                {complete ? 'Done' : 'Later'}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
