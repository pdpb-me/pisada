import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

// Temporary design check page: shows the Pisada tokens on real shadcn
// components. It gets replaced by the Today screen in Phase 1.

// Unselected: soft tint. Selected: solid colour. The number is always shown.
const painBand = {
  low: 'bg-pain-low/15 hover:bg-pain-low/30 data-[state=on]:bg-pain-low data-[state=on]:text-pain-low-foreground',
  mid: 'bg-pain-mid/15 hover:bg-pain-mid/30 data-[state=on]:bg-pain-mid data-[state=on]:text-pain-mid-foreground',
  high: 'bg-pain-high/15 hover:bg-pain-high/30 data-[state=on]:bg-pain-high data-[state=on]:text-pain-high-foreground',
}

function painClass(score: number) {
  if (score <= 3) return painBand.low
  if (score <= 6) return painBand.mid
  return painBand.high
}

const week = [
  { day: 'M', status: 'done' },
  { day: 'T', status: 'done' },
  { day: 'W', status: 'partial' },
  { day: 'T', status: 'skipped' },
  { day: 'F', status: 'pending' },
  { day: 'S', status: 'pending' },
  { day: 'S', status: 'pending' },
] as const

const dotClass = {
  done: 'bg-status-done',
  partial: 'bg-status-partial',
  skipped: 'bg-status-skipped',
  pending: 'border border-muted-foreground/40',
}

function App() {
  const [status, setStatus] = useState('')
  const [pain, setPain] = useState('')

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold">Pisada</h1>
        <p className="text-sm text-muted-foreground">
          Design check: tokens and components
        </p>
      </header>

      <div className="flex justify-between px-1">
        {week.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{d.day}</span>
            <span className={cn('size-3 rounded-full', dotClass[d.status])} />
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendon · AM</CardTitle>
          <CardDescription>
            Heel-raise holds, 5 × 45 s, then toe yoga
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="link" className="h-auto justify-start gap-2 p-0">
            Stop Over-Pronation
            <Badge variant="secondary">14 min</Badge>
          </Button>

          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={status}
            onValueChange={setStatus}
            className="w-full"
          >
            {['Done', 'Partial', 'Skipped'].map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-11 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Arch pain during</span>
            <ToggleGroup
              type="single"
              spacing={1}
              value={pain}
              onValueChange={setPain}
              className="grid w-full grid-cols-11"
            >
              {Array.from({ length: 11 }, (_, n) => (
                <ToggleGroupItem
                  key={n}
                  value={String(n)}
                  aria-label={`Pain ${n} out of 10`}
                  className={cn(
                    'h-11 min-w-0 px-0 text-foreground hover:text-foreground data-[state=on]:font-semibold',
                    painClass(n),
                  )}
                >
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="mt-auto h-11">
        Primary action
      </Button>
    </main>
  )
}

export default App
