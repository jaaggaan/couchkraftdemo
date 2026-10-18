import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'
import { supabase } from './supabase-client.ts'

export type StoreSettings = {
  whatsapp: {
    businessPhone: string // e.g. "+91 63607 04340" or empty
    businessName: string
    enabled: boolean
    conciergeEmail?: string
    workingHours?: string
    defaultLeadTimeWeeks?: number
  }
}

const dataDir = dataDirectory()
const settingsFile = resolve(dataDir, 'settings.json')

const defaultSettings: StoreSettings = {
  whatsapp: {
    businessPhone: '+91 63607 04340',
    businessName: 'CouchKraft Bespoke Concierge',
    enabled: true,
    conciergeEmail: 'concierge@couchkraft.in',
    workingHours: 'Mon - Sat: 10:00 AM - 7:00 PM IST',
    defaultLeadTimeWeeks: 4,
  },
}

function ensureSettingsFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(settingsFile)) {
    writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), 'utf8')
  }
}

export function readSettings(): StoreSettings {
  ensureSettingsFile()
  try {
    const raw = readFileSync(settingsFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoreSettings>
    return {
      whatsapp: {
        ...defaultSettings.whatsapp,
        ...(parsed.whatsapp || {}),
      },
    }
  } catch {
    return defaultSettings
  }
}

export function writeSettings(settings: StoreSettings): StoreSettings {
  ensureSettingsFile()
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8')
  // Sync to Supabase store_settings asynchronously
  try {
    Promise.resolve(
      supabase
        .from('store_settings')
        .upsert([{ key: 'whatsapp', value: settings.whatsapp, updated_at: new Date().toISOString() }], { onConflict: 'key' })
    ).then((res: any) => {
      if (res?.error) console.warn('[Supabase Settings Sync Notice]:', res.error.message)
      else console.log('[Supabase Settings Synced]: WhatsApp configuration saved.')
    }).catch((err: any) => console.warn('[Supabase Settings Sync Catch]:', err))
  } catch (err: any) {
    console.warn('[Supabase Settings Catch]:', err)
  }
  return settings
}

export async function fetchLiveSettings(): Promise<StoreSettings> {
  const local = readSettings()
  try {
    const { data, error } = await supabase.from('store_settings').select('*').eq('key', 'whatsapp').maybeSingle()
    if (!error && data && data.value) {
      const merged: StoreSettings = {
        whatsapp: {
          ...local.whatsapp,
          ...data.value,
        },
      }
      writeFileSync(settingsFile, JSON.stringify(merged, null, 2), 'utf8')
      return merged
    }
  } catch {}
  return local
}
