import { data } from '@/data/store'
import { useQuery } from '@/data/use-query'

// The next heel-raise test session (from today on)
export function useNextTest(today: string) {
  return { next: useQuery(`next-test:${today}`, () => data.nextTest(today)).data ?? null }
}
