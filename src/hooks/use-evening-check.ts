import { data, write } from '@/data/store'
import type { EveningArea } from '@/data/types'
import { useQuery } from '@/data/use-query'

export type { EveningArea } from '@/data/types'

// "How was today?": neck and hand tingling over the whole day, answered in the evening
// (the arch is asked in the morning, first steps). One answer per area per day.
export function useEveningCheck(date: string) {
  const query = useQuery(`evening:${date}`, () => data.evening(date))
  const answers = query.data ?? {}
  return {
    loaded: query.data !== undefined,
    answers,
    save: (area: EveningArea, score: number | null) => write.saveEvening(date, area, score),
    complete: !!(answers.neck && answers.hands),
  }
}
