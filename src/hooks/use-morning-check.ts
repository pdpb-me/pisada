import { data, write } from '@/data/store'
import { useQuery } from '@/data/use-query'

// "How's the arch this morning?" (first steps out of bed) is asked every morning:
// the arch trend needs one answer a day. One answer per morning.
// If yesterday had a run, it also asks whether that run was clean.
export function useMorningCheck(date: string) {
  const query = useQuery(`morning:${date}`, () => data.morning(date))
  const m = query.data
  return {
    loaded: m !== undefined,
    answer: m?.arch ?? null,
    run: m?.run ?? null,
    weight: m?.weight ?? null,
    save: (score: number | null) => write.saveArch(date, score),
    saveClean: (clean: boolean | null) => (m?.run ? write.saveClean(m.run.id, clean) : Promise.resolve(false)),
    saveWeight: (kg: number | null) => write.saveWeight(date, kg),
  }
}
