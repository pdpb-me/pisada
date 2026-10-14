import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { toISODate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

// Kinds that load the arch, so the next morning is worth asking about
const ARCH_LOAD_KINDS = ['run', 'tendon']

function dayBefore(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

// "How's the arch this morning?" is asked when yesterday had a run or tendon
// session that was done or partly done. One answer per morning.
export function useMorningCheck(date: string) {
  const [needed, setNeeded] = useState(false)
  const [answer, setAnswer] = useState<{ id: string; score: number } | null>(null)

  const load = useCallback(async () => {
    const [yesterday, today] = await Promise.all([
      supabase
        .from('plan_sessions')
        .select('id, session_logs!inner(status)')
        .eq('date', dayBefore(date))
        .in('kind', ARCH_LOAD_KINDS)
        .in('session_logs.status', ['done', 'partial'])
        .limit(1),
      supabase
        .from('symptoms')
        .select('id, score')
        .eq('date', date)
        .eq('body_area', 'arch')
        .eq('timing', 'next_morning')
        .limit(1),
    ])
    setNeeded((yesterday.data?.length ?? 0) > 0)
    setAnswer(today.data?.[0] ?? null)
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

  return { needed, answer, save }
}
