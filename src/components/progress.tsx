import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProgress, type Progress as Data } from '@/hooks/use-progress'
import { addDays, weekOf } from '@/lib/dates'
import { painBand, painLabel, type PainBand } from '@/lib/pain'
import { tinglingLabel } from '@/lib/tingling'
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

// A coloured dot with its word (pain colour never comes alone)
function Level({ score, label }: { score: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} />
      {label}
    </span>
  )
}

// ---------- Pain trend: is it getting better? ----------

const TRENDS = [
  { area: 'arch', timing: 'next_morning', title: 'Arch, first steps in the morning', label: painLabel },
  { area: 'arch', timing: 'evening', title: 'Arch, over the day', label: painLabel },
  { area: 'neck', timing: 'evening', title: 'Neck, over the day', label: painLabel },
  { area: 'hands', timing: 'evening', title: 'Hands tingling', label: tinglingLabel },
] as const

const MIN_ANSWERS = 3 // per week, before comparing
const CHANGE = 1 // average points (0–10) that count as a real change

function TrendRow({
  symptoms,
  to,
  trend,
}: {
  symptoms: Data['symptoms']
  to: string
  trend: (typeof TRENDS)[number]
}) {
  const days = Array.from({ length: 28 }, (_, i) => addDays(to, i - 27)) // oldest first, today last
  const scoreOn = (d: string) => {
    const s = symptoms.filter((x) => x.date === d && x.body_area === trend.area && x.timing === trend.timing)
    return s.length ? Math.max(...s.map((x) => x.score)) : undefined
  }
  const scores = days.map(scoreOn)
  const week = (from: number) => scores.slice(from, from + 7).filter((x): x is number => x != null)
  const thisWeek = week(21)
  const lastWeek = week(14)
  const avg = (a: number[]) => a.reduce((t, x) => t + x, 0) / a.length

  let verdict: string
  let detail: string | null = null
  if (thisWeek.length < MIN_ANSWERS || lastWeek.length < MIN_ANSWERS) {
    verdict = 'Not enough answers yet'
    detail = `${thisWeek.length} this week, ${lastWeek.length} last week. It compares weeks once each has ${MIN_ANSWERS}.`
  } else {
    const now = avg(thisWeek)
    const before = avg(lastWeek)
    verdict = now <= before - CHANGE ? 'Better than last week' : now >= before + CHANGE ? 'Worse than last week' : 'About the same as last week'
    const nowWord = trend.label(Math.round(now))
    const beforeWord = trend.label(Math.round(before))
    detail =
      nowWord !== beforeWord
        ? `This week mostly ${nowWord}, last week mostly ${beforeWord}.`
        : verdict.startsWith('About')
          ? `Mostly ${nowWord} both weeks.`
          : `Mostly ${nowWord} both weeks, but ${now < before ? 'lower' : 'higher'} this week.`
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{trend.title}</span>
      </div>
      <span className="text-base font-semibold">{verdict}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      {/* 28 days, oldest left; hollow = no answer that day */}
      <div className="mt-1 flex gap-0.5" aria-hidden>
        {scores.map((sc, i) => (
          <span
            key={days[i]}
            title={`${shortDate(days[i])}: ${sc == null ? 'no answer' : trend.label(sc)}`}
            className={cn('h-3 flex-1 rounded-sm', sc == null ? 'ring-1 ring-inset ring-foreground/15' : PAIN_DOT[painBand(sc)])}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>4 weeks ago</span>
        <span>today</span>
      </div>
    </div>
  )
}

function PainTrend({ symptoms, to }: { symptoms: Data['symptoms']; to: string }) {
  return (
    <Section title="Pain trend" note="Is it getting better? Last 7 days against the 7 before">
      <div className="flex flex-col gap-6">
        {TRENDS.map((t) => (
          <TrendRow key={t.area + t.timing} symptoms={symptoms} to={to} trend={t} />
        ))}
      </div>
    </Section>
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
    .map((d) => ({
      d,
      morning: max(d, 'arch', 'next_morning'),
      archDay: max(d, 'arch', 'evening'),
      neck: max(d, 'neck', 'evening'),
      hands: max(d, 'hands', 'evening'),
    }))
    .filter((r) => r.morning != null || r.archDay != null || r.neck != null || r.hands != null)
  return (
    <Section title="Day by day" note="Last 14 days: morning and evening check-ins">
      {rows.length === 0 ? (
        <Empty>No pain scores in the last 14 days.</Empty>
      ) : (
        <Table
          head={['Date', 'Arch AM', 'Arch day', 'Neck', 'Hands']}
          rows={rows.map((r) => [
            shortDate(r.d),
            <Pain key="morning" score={r.morning} />,
            <Pain key="archDay" score={r.archDay} />,
            <Pain key="neck" score={r.neck} />,
            r.hands == null ? <span key="hands" className="text-muted-foreground">–</span> : <Level key="hands" score={r.hands} label={tinglingLabel(r.hands)} />,
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
          <PainTrend symptoms={data.symptoms} to={data.to} />
          <TestResults tests={data.tests} />
          <Adherence sessions={data.sessions} from={data.from} to={data.to} />
          <PainByDay symptoms={data.symptoms} to={data.to} />
          <Runs runs={data.runs} />
          <WatchActivities watch={data.watch} />
        </>
      )}
    </main>
  )
}
