import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// "How was today?": arch, neck and hand tingling over the whole day, answered in
// the evening. One answer per area per day (timing 'evening', no session).
export type EveningArea = 'arch' | 'neck' | 'hands'

const ROW: Record<EveningArea, { side: string; context: string }> = {
  arch: { side: 'R', context: 'evening check-in' },
  neck: { side: 'C', context: 'evening check-in' },
  hands: { side: 'C', context: 'tingling' },
}

type Answer = { id: string; score: number }

export function useEveningCheck(date: string) {
  const [answers, setAnswers] = useState<Partial<Record<EveningArea, Answer>>>({})

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('symptoms')
      .select('id, body_area, score')
      .eq('date', date)
      .eq('timing', 'evening')
      .is('session_log_id', null)
    const next: Partial<Record<EveningArea, Answer>> = {}
    for (const s of data ?? []) next[s.body_area as EveningArea] = { id: s.id, score: s.score }
    setAnswers(next)
  }, [date])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    load()
  }, [load])

  async function save(area: EveningArea, score: number | null) {
    const answer = answers[area]
    const { error } =
      score == null
        ? answer
          ? await supabase.from('symptoms').delete().eq('id', answer.id)
          : { error: null }
        : answer
          ? await supabase.from('symptoms').update({ score }).eq('id', answer.id)
          : await supabase
              .from('symptoms')
              .insert({ date, body_area: area, timing: 'evening', score, ...ROW[area] })
    if (error) {
      toast.error(`Not saved: ${error.message}`)
      await load()
      return false
    }
    await load()
    return true
  }

  const complete = !!(answers.arch && answers.neck && answers.hands)
  return { answers, save, complete }
}
