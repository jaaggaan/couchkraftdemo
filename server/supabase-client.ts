import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

function requireSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) {
    throw new Error('SUPABASE_URL is required for server-side database access.')
  }
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for protected server-side database mutations.')
  }
  return { url, key }
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, key } = requireSupabaseConfig()
    client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return client
}

/** Lazy singleton — safe to import during Vite production build (no env until first API use). */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const value = (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getSupabase()) : Reflect.get(getSupabase() as object, prop, receiver)
  },
})

export const SUPABASE_URL = () => process.env.SUPABASE_URL?.trim()
export const SUPABASE_SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()