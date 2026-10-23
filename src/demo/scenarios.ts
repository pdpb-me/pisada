// Moments in the made-up 12 weeks worth visiting (see src/demo/simulate.ts).
import { addDays } from '@/lib/dates'
import { FIRST_MONDAY } from '@/demo/simulate'

export type Scenario = { id: string; title: string; about: string; at: string; empty?: boolean }

const W = (w: number, dow: number) => addDays(FIRST_MONDAY, (w - 1) * 7 + dow)

// Moments worth visiting (local time). The first one is where the demo opens.
export const SCENARIOS: Scenario[] = [
  {
    id: 'today',
    title: 'A Thursday morning',
    about: 'Week 10, 06:55: a heavy bike week; yesterday’s run waits for “clean?”',
    at: `${W(10, 3)}T06:55`,
  },
  { id: 'test-day', title: 'Test day', about: 'Week 12, Thursday: the heel-raise test, back after a holiday', at: `${W(12, 3)}T07:40` },
  { id: 'ordinary', title: 'An ordinary week', about: 'Week 2, Wednesday evening, run day', at: `${W(2, 2)}T19:30` },
  { id: 'trip', title: 'Back from a hut trip', about: 'Week 4, Monday: the weekend’s hikes, routine missed', at: `${W(5, 0)}T07:30` },
  { id: 'sick', title: 'A sick week', about: 'Week 5, Friday: almost everything skipped', at: `${W(5, 4)}T20:30` },
  { id: 'flare', title: 'Arch flare-up', about: 'Week 7, Friday: a run that wasn’t clean, Severe morning', at: `${W(7, 4)}T07:20` },
  { id: 'ladder-up', title: 'Ladder goes up', about: 'Week 4, Monday: 2 clean runs, step 3 planned', at: `${W(4, 0)}T07:30` },
  { id: 'late', title: 'Missed check-ins', about: 'Week 6, Wednesday: yesterday not logged yet', at: `${W(6, 2)}T07:30` },
  { id: 'moved', title: 'Sessions moved', about: 'Week 8, Thursday: the run moved here from Wednesday', at: `${W(8, 3)}T17:00` },
  { id: 'test', title: 'Test results', about: 'Week 9, Monday evening: left and right logged', at: `${W(9, 0)}T20:30` },
  { id: 'new-block', title: 'New month, new block', about: 'Week 10, Monday 2 Nov: month 3, step 5', at: `${W(10, 0)}T07:30` },
  { id: 'bike', title: 'Heavy bike week', about: 'Week 10, Friday 19:30: neck and tingling worse', at: `${W(10, 4)}T19:30` },
  { id: 'gap', title: 'Back from holiday', about: 'Week 12, Monday: 9 days without the app', at: `${W(12, 0)}T07:30` },
  { id: 'day-one', title: 'Day 1', about: 'An empty database: nothing planned yet', at: `${W(1, 0)}T09:00`, empty: true },
]
