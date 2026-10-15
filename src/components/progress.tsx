import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProgress, type Progress as Data } from '@/hooks/use-progress'
import { addDays, weekOf } from '@/lib/dates'
import { painBand, painLabel, type PainBand } from '@/lib/pain'
import { cn } from '@/lib/utils'

// First version: plain tables, no charts. Shows that the data is there and adds up.

const PAIN_DOT: Record<PainBand, string> = { low: 'bg-pain-low', mid: 'bg-pain-mid', high: 'bg-pain-high' }

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Pain({ score }: { score: number | undefined }) {
  if (score == null) return <span className="text-muted-foreground">–</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} />
      {painLabel(score)}
    </span>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          {head.map((h) => (
            <th key={h} className="pb-2 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            {r.map((c, j) => (
              <td key={j} className="py-2 pr-2">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {note && <CardDescription>{note}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function TestResults({ tests }: { tests: Data['tests'] }) {
  const heel = tests.filter((t) => t.test === 'sl_heel_raise')
  const dates = [...new Set(heel.map((t) => t.date))]
  const value = (date: string, side: string) => heel.find((t) => t.date === date && t.side === side)?.value
  return (
    <Section title="Heel-raise test" note="Single-leg heel raises to fatigue, reps per side">
      {dates.length === 0 ? (
        <Empty>No results yet. Baseline is on 16 Oct.</Empty>
      ) : (
        <Table
          head={['Date', 'Left', 'Right']}
          rows={dates.map((d) => [shortDate(d), value(d, 'L') ?? '–', value(d, 'R') ?? '–'])}
        />
      )}
    </Section>
  )
}

function PainByDay({ symptoms, to }: { symptoms: Data['symptoms']; to: string }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(to, -i))
  // the highest score of the day, per body area and timing
  const max = (date: string, area: string, timing: string) => {
    const s = symptoms.filter((x) => x.date === date && x.body_area === area && x.timing === timing)
    return s.length ? Math.max(...s.map((x) => x.score)) : undefined
  }
  const rows = days
    .map((d) => ({ d, during: max(d, 'arch', 'during'), morning: max(d, 'arch', 'next_morning'), neck: max(d, 'neck', 'during') }))
    .filter((r) => r.during != null || r.morning != null || r.neck != null)
  return (
    <Section title="Pain" note="Last 14 days. Highest score of the day">
      {rows.length === 0 ? (
        <Empty>No pain scores in the last 14 days.</Empty>
      ) : (
        <Table
          head={['Date', 'Arch, during', 'Arch, morning', 'Neck']}
          rows={rows.map((r) => [
            shortDate(r.d),
            <Pain key="during" score={r.during} />,
            <Pain key="morning" score={r.morning} />,
            <Pain key="neck" score={r.neck} />,
          ])}
        />
      )}
    </Section>
  )
}

function Runs({ runs }: { runs: Data['runs'] }) {
  return (
    <Section title="Runs" note="Logged in the app, last 4 weeks">
      {runs.length === 0 ? (
        <Empty>No runs logged in the last 4 weeks.</Empty>
      ) : (
        <Table
          head={['Date', 'Ladder step', 'Clean']}
          rows={runs.map((r) => [
            shortDate(r.date),
            r.run_step ?? '–',
            r.clean == null ? '–' : r.clean ? 'Yes' : 'No',
          ])}
        />
      )}
    </Section>
  )
}

function minutesText(s: number | null) {
  if (s == null) return '–'
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m} min`
}

function WatchActivities({ watch }: { watch: Data['watch'] }) {
  return (
    <Section title="Watch activities" note="From Suunto via intervals.icu, last 4 weeks">
      {watch.length === 0 ? (
        <Empty>Nothing synced yet.</Empty>
      ) : (
        <Table
          head={['Date', 'Sport', 'Time', 'km', 'HR', 'Load']}
          rows={watch.map((a) => [
            shortDate(a.date),
            a.sport,
            minutesText(a.duration_s),
            a.distance_m ? (a.distance_m / 1000).toFixed(1) : '–',
            a.hr_avg ?? '–',
            a.load ?? '–',
          ])}
        />
      )}
    </Section>
  )
}

function Adherence({ sessions, from, to }: { sessions: Data['sessions']; from: string; to: string }) {
  // Weeks start on Monday; only sessions up to today count
  const weeks = [...new Set(sessions.filter((s) => s.date >= from && s.date <= to).map((s) => weekOf(s.date)[0]))].sort()
  const rows = weeks.map((w) => {
    const inWeek = sessions.filter((s) => weekOf(s.date)[0] === w && s.date <= to)
    const n = (status: string | null) => inWeek.filter((s) => s.status === status).length
    return [`Week of ${shortDate(w)}`, n('done'), n('partial'), n('skipped'), n(null), inWeek.length]
  })
  return (
    <Section title="Adherence" note="Planned sessions up to today, per week">
      {rows.length === 0 ? (
        <Empty>No planned sessions yet.</Empty>
      ) : (
        <Table head={['Week', 'Done', 'Partial', 'Skipped', 'Not logged', 'Planned']} rows={rows} />
      )}
    </Section>
  )
}

export function Progress() {
  const data = useProgress()
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">Last 4 weeks</p>
      </header>
      {data === undefined ? (
        <>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </>
      ) : (
        <>
          <TestResults tests={data.tests} />
          <PainByDay symptoms={data.symptoms} to={data.to} />
          <Runs runs={data.runs} />
          <WatchActivities watch={data.watch} />
          <Adherence sessions={data.sessions} from={data.from} to={data.to} />
        </>
      )}
    </main>
  )
}
