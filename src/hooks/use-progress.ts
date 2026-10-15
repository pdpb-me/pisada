import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { addDays, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

export const PROGRESS_DAYS = 28

export type Progress = {
  from: string
  to: string
  sessions: { date: string; status: string | null }[]
  symptoms: Pick<Tables<'symptoms'>, 'date' | 'body_area' | 'timing' | 'score'>[]
  runs: Pick<Tables<'activities'>, 'date' | 'run_step' | 'clean'>[]
  watch: Pick<Tables<'activities'>, 'date' | 'sport' | 'duration_s' | 'distance_m' | 'hr_avg' | 'load'>[]
  tests: Pick<Tables<'tests'>, 'date' | 'test' | 'side' | 'value' | 'unit'>[]
}

// Everything the Progress screen shows: the last 4 weeks, plus every test result.
export function useProgress() {
  const [data, setData] = useState<Progress | undefined>(undefined)

  useEffect(() => {
    const to = todayISO()
    const from = addDays(to, -(PROGRESS_DAYS - 1))
    Promise.all([
      supabase.from('plan_sessions').select('date, session_logs(status)').gte('date', from).lte('date', to),
      supabase.from('symptoms').select('date, body_area, timing, score').gte('date', from).lte('date', to),
      supabase.from('activities').select('date, run_step, clean').eq('sport', 'run').neq('source', 'intervals').gte('date', from).order('date'),
      // watch data synced from intervals.icu
      supabase.from('activities').select('date, sport, duration_s, distance_m, hr_avg, load').eq('source', 'intervals').gte('date', from).order('date', { ascending: false }),
      supabase.from('tests').select('date, test, side, value, unit').order('date'),
    ]).then(([s, sy, a, w, t]) => {
      const error = s.error ?? sy.error ?? a.error ?? w.error ?? t.error
      if (error) toast.error(`Couldn't load progress: ${error.message}`)
      setData({
        from,
        to,
        sessions: (s.data ?? []).map((x) => ({ date: x.date, status: x.session_logs?.status ?? null })),
        symptoms: sy.data ?? [],
        runs: a.data ?? [],
        watch: w.data ?? [],
        tests: t.data ?? [],
      })
    })
  }, [])

  return data
}
