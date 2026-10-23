import { data } from '@/data/store'
import type { ProgressData } from '@/data/types'
import { useQuery } from '@/data/use-query'

export type { WatchActivity } from '@/data/types'
export type Progress = ProgressData

export function useProgress(today: string) {
  return useQuery(`progress:${today}`, () => data.progress(today), { keepPrevious: true }).data
}
