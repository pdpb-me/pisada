import { data } from '@/data/store'
import { useQuery } from '@/data/use-query'

export type { DayDot } from '@/data/types'

// Status of every planned session from the first to the last day, for the week strip dots
export function useWeek(days: string[]) {
  const first = days[0]
  const last = days[days.length - 1]
  const query = useQuery(`week:${first}:${last}`, () => data.weekDots(first, last), { keepPrevious: true })
  return { dots: query.data ?? {}, reload: query.reload }
}
