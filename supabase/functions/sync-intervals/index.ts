// "Sync now" in Activities: copies the last 7 days of watch activities from intervals.icu
// into `activities`, as the logged-in user (their own JWT, so RLS applies: no service key).
// Secrets (Supabase dashboard → Edge Functions → Secrets): INTERVALS_API_KEY, INTERVALS_ATHLETE_ID.
// The daily GitHub Action does the same with scripts/sync-intervals.mjs.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { fetchActivities, lastDays, toRows } from '../_shared/intervals.js'

const DAYS = 7

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const apiKey = Deno.env.get('INTERVALS_API_KEY')
  if (!apiKey) return json({ error: 'Sync is not set up yet: the intervals.icu key is missing in Supabase.' }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return json({ error: 'Not logged in' }, 401)

  try {
    const list = await fetchActivities({
      apiKey,
      athlete: Deno.env.get('INTERVALS_ATHLETE_ID') ?? '0',
      ...lastDays(DAYS),
    })
    const rows = toRows(list, auth.user.id)
    if (rows.length) {
      const { error } = await supabase.from('activities').upsert(rows, { onConflict: 'user_id,external_id' })
      if (error) throw new Error(error.message)
    }
    const synced_at = new Date().toISOString()
    const { error } = await supabase
      .from('sync_status')
      .upsert({ user_id: auth.user.id, source: 'intervals', synced_at, count: rows.length, via: 'app' })
    if (error) throw new Error(error.message)
    return json({ count: rows.length, synced_at })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})
