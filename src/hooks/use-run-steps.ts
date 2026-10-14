import { useEffect, useState } from 'react'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type RunStep = Tables<'run_steps'>

// The ladder steps, as stored in the run_steps table (the coaching chat adds more)
export function useRunSteps() {
  const [steps, setSteps] = useState<RunStep[]>([])

  useEffect(() => {
    supabase
      .from('run_steps')
      .select('*')
      .order('step')
      .then(({ data }) => setSteps(data ?? []))
  }, [])

  return steps
}

// The step of the most recently logged run: the default for the next one
export async function lastRunStep(): Promise<number> {
  const { data } = await supabase
    .from('activities')
    .select('run_step')
    .eq('sport', 'run')
    .not('run_step', 'is', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.run_step ?? 1
}
