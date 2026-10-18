import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qzpnxxlwlphxdcdlbiph.supabase.co'
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BfUf7XGJyrvhltzbKfq5Zg_zf_EFmnw'

export const supabase = createClient(supabaseUrl, supabaseKey)
