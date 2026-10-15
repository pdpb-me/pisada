import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { addDays, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { Symptom } from '@/lib/trends'

export type WatchActivity = Pick<Tables<'activities'>, 'id' | 'date' | 'sport' | 'duration_s' | 'distance_m' | 'hr_avg' | 'load'>

export type Progress = {
  today: string
  symptoms: Symptom[] // a year, so 6 months can be compared with the 6 before
  runs: Pick<Tables<'activities'>, 'date' | 'run_step' | 'clean'>[] // logged in the app, newest first
  watch: WatchActivity[] // synced from intervals.icu, 6 months, newest first
  tests: Pick<Tables<'tests'>, 'date' | 'test' | 'side' | 'value' | 'unit'>[]
}

export function useProgress() {
  const [data, setData] = useState<Progress | undefined>(undefined)

  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('symptoms').select('date, body_area, timing, score').gte('date', addDays(today, -364)).lte('date', today),
      supabase
        .from('activities')
        .select('date, run_step, clean')
        .eq('sport', 'run')
        .neq('source', 'intervals')
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('activities')
        .select('id, date, sport, duration_s, distance_m, hr_avg, load')
        .eq('source', 'intervals')
        .gte('date', addDays(today, -182))
        .order('date', { ascending: false }),
      supabase.from('tests').select('date, test, side, value, unit').order('date'),
    ]).then(([sy, r, w, t]) => {
      const error = sy.error ?? r.error ?? w.error ?? t.error
      if (error) toast.error(`Couldn't load progress: ${error.message}`)
      setData({ today, symptoms: sy.data ?? [], runs: r.data ?? [], watch: w.data ?? [], tests: t.data ?? [] })
    })
  }, [])

  return data
}
