import { ChevronRightIcon, XIcon } from 'lucide-react'
import { ExerciseFigure } from '@/components/exercise-figure'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { exerciseFor } from '@/exercises/catalog'
import { cn } from '@/lib/utils'

// Small tappable 16:9 figure, the same box as a video thumbnail when w-28.
export function ExerciseThumbnail({
  slug,
  onOpen,
  className,
}: {
  slug: string
  onOpen: () => void
  className?: string
}) {
  const ex = exerciseFor(slug)
  if (!ex) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Show ${ex.name} large`}
      className={cn('block aspect-video shrink-0 overflow-hidden rounded-md bg-muted p-1', className)}
    >
      <ExerciseFigure slug={slug} contain className="size-full" />
    </button>
  )
}

// One row per exercise on the card: small figure + name. The whole row opens the sheet.
export function ExerciseRow({ slug, onOpen }: { slug: string; onOpen: () => void }) {
  const ex = exerciseFor(slug)
  if (!ex) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-3 rounded-md text-left hover:bg-muted/50"
    >
      <span className="block aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-muted p-0.5">
        <ExerciseFigure slug={slug} contain className="size-full" />
      </span>
      <span className="flex-1 text-sm font-medium">{ex.name}</span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</span>
  )
}

// Near-full-screen sheet: the figure large with its inset, then today's plan, tempo, cues, don'ts, setup.
// "Today's plan" is the session's own instructions (the plan can change); the catalog dose is the fallback.
// slug stays set while it closes, so the content doesn't vanish mid-animation.
export function ExerciseDrawer({
  slug,
  open,
  sessionTitle,
  instructions,
  onOpenChange,
}: {
  slug: string | null
  open: boolean
  sessionTitle: string
  instructions: string | null
  onOpenChange: (open: boolean) => void
}) {
  const ex = slug ? exerciseFor(slug) : undefined
  const dose = instructions?.trim() || ex?.dose

  return (
    <Drawer open={open && !!ex} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:h-[90vh] data-[vaul-drawer-direction=bottom]:max-h-[90vh]">
        {ex && (
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
            <DrawerHeader className="group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerDescription>{sessionTitle}</DrawerDescription>
              <DrawerTitle className="text-xl">{ex.name}</DrawerTitle>
            </DrawerHeader>

            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pb-2">
              <ExerciseFigure slug={ex.slug} inset dots className="rounded-xl bg-muted/50 p-2" />

              {dose && (
                <div className="flex flex-col gap-1">
                  <Label>Today’s plan</Label>
                  {/* Big when it's a short dose; a long instruction stays readable */}
                  <p className={cn('font-semibold tabular-nums', dose.length <= 32 ? 'text-3xl' : 'text-base')}>
                    {dose}
                  </p>
                  {ex.tempo && <p className="text-lg font-medium text-primary">{ex.tempo}</p>}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label>Cues</Label>
                <ul className="list-disc pl-5 text-lg font-medium">
                  {ex.cues.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Don’t</Label>
                <ul className="flex flex-col gap-0.5 text-muted-foreground">
                  {ex.donts.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <XIcon className="size-4 shrink-0" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Setup</Label>
                <p>{ex.setup}</p>
              </div>

              {ex.stop && (
                <div className="flex flex-col gap-1">
                  <Label>Stop</Label>
                  <p className="text-muted-foreground">{ex.stop}</p>
                </div>
              )}
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button size="lg" variant="secondary" className="h-11">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
