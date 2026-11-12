import { data, READS, write } from '@/data/store'
import type { CheckIns, EveningArea } from '@/data/types'
import { useQuery } from '@/data/use-query'
import { usePending } from '@/hooks/use-pending'
import type { CheckInArea } from '@/data/rules'
import type { Hand } from '@/lib/tingling'
import type { Trigger } from '@/lib/triggers'

// The day's morning and evening check-ins. A tap shows at once.
export function useCheckIns(date: string) {
  const query = useQuery(`check-ins:${date}`, READS.checkIns, () => data.checkIns(date))
  const pending = usePending<number | boolean | string | string[] | null>(query.data)

  let shown: CheckIns | undefined = query.data
  if (shown) {
    const c = { ...shown }
    for (const area of ['arch', 'neck', 'hands'] as const) {
      const p = pending.get(area)
      if (p) c[area] = p.value as number | null
    }
    const w = pending.get('weight')
    if (w) c.weight = w.value as number | null
    const hand = pending.get('hand')
    if (hand) c.hand = hand.value as Hand | null
    for (const key of ['neckTriggers', 'handsTriggers'] as const) {
      const t = pending.get(key)
      if (t) c[key] = t.value as Trigger[]
    }
    const clean = pending.get('clean')
    if (clean && c.run) c.run = { ...c.run, clean: clean.value as boolean | null }
    shown = c
  }

  return {
    date,
    checkIns: shown,
    error: query.error,
    retry: query.retry,
    save: (area: CheckInArea, score: number | null) => pending.tap(area, score, () => write.saveCheckIn(date, area, score)),
    saveHand: (hand: Hand | null) => pending.tap('hand', hand, () => write.saveCheckInDetails(date, 'hands', { side: hand })),
    saveTriggers: (area: EveningArea, triggers: Trigger[]) =>
      pending.tap(`${area}Triggers`, triggers, () => write.saveCheckInDetails(date, area, { triggers })),
    saveWeight: (kg: number | null) => pending.tap('weight', kg, () => write.saveWeight(date, kg)),
    saveClean: (clean: boolean | null) =>
      query.data?.run ? pending.tap('clean', clean, () => write.saveClean(query.data!.run!.id, clean)) : Promise.resolve(false),
  }
}
