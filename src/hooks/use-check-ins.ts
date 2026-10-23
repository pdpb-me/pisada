import { data, READS, write } from '@/data/store'
import type { CheckIns } from '@/data/types'
import { useQuery } from '@/data/use-query'
import { usePending } from '@/hooks/use-pending'
import type { CheckInArea } from '@/data/rules'

// The day's morning and evening check-ins. A tap shows at once.
export function useCheckIns(date: string) {
  const query = useQuery(`check-ins:${date}`, READS.checkIns, () => data.checkIns(date))
  const pending = usePending<number | boolean | null>(query.data)

  let shown: CheckIns | undefined = query.data
  if (shown) {
    const c = { ...shown }
    for (const area of ['arch', 'neck', 'hands'] as const) {
      const p = pending.get(area)
      if (p) c[area] = p.value as number | null
    }
    const w = pending.get('weight')
    if (w) c.weight = w.value as number | null
    const clean = pending.get('clean')
    if (clean && c.run) c.run = { ...c.run, clean: clean.value as boolean | null }
    shown = c
  }

  return {
    checkIns: shown,
    error: query.error,
    retry: query.retry,
    save: (area: CheckInArea, score: number | null) => pending.tap(area, score, () => write.saveCheckIn(date, area, score)),
    saveWeight: (kg: number | null) => pending.tap('weight', kg, () => write.saveWeight(date, kg)),
    saveClean: (clean: boolean | null) =>
      query.data?.run ? pending.tap('clean', clean, () => write.saveClean(query.data!.run!.id, clean)) : Promise.resolve(false),
  }
}
