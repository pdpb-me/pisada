import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { addDays } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

// "How's the arch this morning?" (first steps out of bed) is asked every morning:
// the arch trend needs one answer a day. One answer per morning.
// If yesterday had a run, it also asks whether that run was clean (when it
// wasn't already set on the run card).
export function useMorningCheck(date: string) {
  const [answer, setAnswer] = useState<{ id: string; score: number } | null>(null)
  const [run, setRun] = useState<{ id: string; clean: boolean | null } | null>(null)

  const load = useCallback(async () => {
    const [today, yesterdayRun] = await Promise.all([
      supabase
        .from('symptoms')
        .select('id, score')
        .eq('date', date)
        .eq('body_area', 'arch')
        .eq('timing', 'next_morning')
        .limit(1),
      supabase
        .from('activities')
        .select('id, clean')
        .eq('date', addDays(date, -1))
        .eq('sport', 'run')
        .neq('source', 'intervals') // the run you logged, not its watch copy
        .limit(1),
    ])
    setAnswer(today.data?.[0] ?? null)
    setRun(yesterdayRun.data?.[0] ?? null)
  }, [date])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    load()
  }, [load])

  async function save(score: number | null) {
    const { error } =
      score == null
        ? answer
          ? await supabase.from('symptoms').delete().eq('id', answer.id)
          : { error: null }
        : answer
          ? await supabase.from('symptoms').update({ score }).eq('id', answer.id)
          : await supabase.from('symptoms').insert({
              date,
              body_area: 'arch',
              side: 'R',
              timing: 'next_morning',
              score,
              context: 'morning check-in',
            })
    if (error) {
      toast.error(`Not saved: ${error.message}`)
      return false
    }
    await load()
    return true
  }

  async function saveClean(clean: boolean | null) {
    if (!run) return false
    const { error } = await supabase.from('activities').update({ clean }).eq('id', run.id)
    if (error) {
      toast.error(`Not saved: ${error.message}`)
      return false
    }
    await load()
    return true
  }

  return { answer, save, run, saveClean }
}
