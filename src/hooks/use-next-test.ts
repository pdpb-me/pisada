import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Result = { date: string; side: string | null; value: number }

// The next heel-raise test session (from today on) and every result so far.
export function useNextTest(today: string) {
  const [next, setNext] = useState<{ date: string } | null>(null)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    Promise.all([
      supabase
        .from('plan_sessions')
        .select('date')
        .contains('exercises', ['sl_heel_raise_test'])
        .gte('date', today)
        .order('date')
        .limit(1),
      supabase.from('tests').select('date, side, value').eq('test', 'sl_heel_raise').order('date'),
    ]).then(([n, r]) => {
      setNext(n.data?.[0] ?? null)
      setResults(r.data ?? [])
    })
  }, [today])

  return { next, results }
}
