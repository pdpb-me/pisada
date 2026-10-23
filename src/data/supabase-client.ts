import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Both values are public by design: the publishable key only lets the browser
// talk to Supabase. What protects the data is login + Row Level Security.
// Never put the secret (service_role) key here or anywhere in this repo.
const SUPABASE_URL = 'https://swubnxbzjqjeuiwlauwi.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_t_sNt_oINdHi5pEedbgzsQ_Qq3wknPN'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
