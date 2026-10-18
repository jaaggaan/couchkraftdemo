import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qzpnxxlwlphxdcdlbiph.supabase.co'
export const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_BfUf7XGJyrvhltzbKfq5Zg_zf_EFmnw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
