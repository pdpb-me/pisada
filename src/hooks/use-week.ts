import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type DayDot = { id: string; slot: string; status: string | null }

// Status of every planned session in a week, for the week strip dots
export function useWeek(days: string[]) {
  const [dots, setDots] = useState<Record<string, DayDot[]>>({})
  const first = days[0]
  const last = days[days.length - 1]

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('plan_sessions')
      .select('id, date, slot, session_logs(status)')
      .gte('date', first)
      .lte('date', last)
      .order('slot')
      .order('created_at')
    const byDay: Record<string, DayDot[]> = {}
    for (const s of data ?? []) {
      ;(byDay[s.date] ??= []).push({ id: s.id, slot: s.slot, status: s.session_logs?.status ?? null })
    }
    setDots(byDay)
  }, [first, last])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    reload()
  }, [reload])

  return { dots, reload }
}
