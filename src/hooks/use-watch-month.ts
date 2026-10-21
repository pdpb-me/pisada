import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { WatchActivity } from '@/hooks/use-progress'
import { addDays, weekOf } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

// 'YYYY-MM' → the Mondays that fall in that month. A week belongs to the month of its Monday,
// so a week across two months shows once.
export function mondaysOf(month: string) {
  const first = weekOf(`${month}-01`)[0]
  const start = first < `${month}-01` ? addDays(first, 7) : first
  const mondays: string[] = []
  for (let d = start; d.startsWith(month); d = addDays(d, 7)) mondays.push(d)
  return mondays
}

// Watch activities (synced from intervals.icu) for one month's weeks, newest first,
// plus the month of the oldest one, so the switcher knows where to stop.
export function useWatchMonth(month: string) {
  const [items, setItems] = useState<WatchActivity[] | undefined>(undefined)
  const [oldestMonth, setOldestMonth] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const mondays = mondaysOf(month)
    const [list, oldest] = await Promise.all([
      supabase
        .from('activities')
        .select('id, date, sport, duration_s, distance_m, hr_avg, load')
        .eq('source', 'intervals')
        .gte('date', mondays[0])
        .lte('date', addDays(mondays[mondays.length - 1], 6))
        .order('date', { ascending: false }),
      supabase.from('activities').select('date').eq('source', 'intervals').order('date').limit(1),
    ])
    if (list.error) toast.error(`Couldn't load activities: ${list.error.message}`)
    setItems(list.data ?? [])
    const first = oldest.data?.[0]?.date
    setOldestMonth(first ? weekOf(first)[0].slice(0, 7) : null)
  }, [month])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    reload()
  }, [reload])

  return { items, oldestMonth, reload }
}

// When the watch data was last copied, and "Sync now" (Edge Function sync-intervals)
export function useSync(onSynced: () => void) {
  const [syncedAt, setSyncedAt] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('sync_status').select('synced_at').eq('source', 'intervals').maybeSingle()
    setSyncedAt(data?.synced_at ?? null)
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching data is what this effect is for
    load()
  }, [load])

  const syncNow = async () => {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke<{ count: number; synced_at: string }>('sync-intervals', {
      method: 'POST',
    })
    setBusy(false)
    if (error) {
      // the function's own message, when it sent one
      const body = await (error.context as Response | undefined)?.json?.().catch(() => null)
      toast.error(`Couldn't sync: ${body?.error ?? error.message}`)
      return
    }
    setSyncedAt(data?.synced_at ?? new Date().toISOString())
    toast.success(data?.count ? `Synced: ${data.count} activities from the last 7 days` : 'Synced: nothing new')
    onSynced()
  }

  return { syncedAt, busy, syncNow }
}
