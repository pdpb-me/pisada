import { useState } from 'react'
import { toast } from 'sonner'
import { data, syncNow as sync } from '@/data/store'
import { useQuery } from '@/data/use-query'
import { addDays, weekOf } from '@/lib/dates'

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
  const mondays = mondaysOf(month)
  const from = mondays[0]
  const to = addDays(mondays[mondays.length - 1], 6)
  const list = useQuery(`watch:${from}:${to}`, () => data.watch(from, to))
  const oldest = useQuery('watch-oldest', data.oldestWatchDate)
  const first = oldest.data
  return { items: list.data, error: list.error, oldestMonth: first ? weekOf(first)[0].slice(0, 7) : null }
}

// When the watch data was last copied, and "Sync now" (Edge Function sync-intervals)
export function useSync() {
  const syncedAt = useQuery('synced-at', data.syncedAt)
  const [busy, setBusy] = useState(false)

  const syncNow = async () => {
    setBusy(true)
    const result = await sync()
    setBusy(false)
    if (result) toast.success(result.count ? `Synced: ${result.count} activities from the last 7 days` : 'Synced: nothing new')
  }

  return { syncedAt: syncedAt.data, busy, syncNow }
}
