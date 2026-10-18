import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'
import { supabase } from './supabase-client.ts'

export type CustomRequestStatus = 'new' | 'under_review' | 'quoted' | 'approved' | 'archived'

export type CustomRequest = {
  id: string
  customerId?: string | null
  customerName: string
  customerEmail?: string
  customerPhone: string
  productId?: string
  productName?: string
  productUrl?: string
  seatingCapacity?: string
  dimensions?: {
    width?: number | string
    depth?: number | string
    height?: number | string
    unit?: string
  }
  material?: string
  fabric?: string
  color?: string
  budget?: string
  notes?: string
  status: CustomRequestStatus
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

const dataDir = dataDirectory()
const requestsFile = resolve(dataDir, 'custom_requests.json')

function ensureRequestsFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(requestsFile)) {
    writeFileSync(requestsFile, JSON.stringify([], null, 2), 'utf8')
  }
}

export function readCustomRequests(): CustomRequest[] {
  ensureRequestsFile()
  try {
    const raw = readFileSync(requestsFile, 'utf8')
    return JSON.parse(raw) as CustomRequest[]
  } catch {
    return []
  }
}

export function writeCustomRequests(items: CustomRequest[]) {
  ensureRequestsFile()
  writeFileSync(requestsFile, JSON.stringify(items, null, 2), 'utf8')
}

export async function createCustomRequest(input: Partial<CustomRequest>): Promise<CustomRequest> {
  const requests = readCustomRequests()
  const id = `CK-REQ-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
  const now = new Date().toISOString()

  const newReq: CustomRequest = {
    id,
    customerId: input.customerId || null,
    customerName: String(input.customerName || 'Anonymous Client').trim(),
    customerEmail: String(input.customerEmail || '').trim(),
    customerPhone: String(input.customerPhone || '').trim(),
    productId: input.productId || undefined,
    productName: input.productName || undefined,
    productUrl: input.productUrl || undefined,
    seatingCapacity: input.seatingCapacity || undefined,
    dimensions: input.dimensions || {},
    material: input.material || undefined,
    fabric: input.fabric || undefined,
    color: input.color || undefined,
    budget: input.budget || undefined,
    notes: input.notes || undefined,
    status: 'new',
    adminNotes: '',
    createdAt: now,
    updatedAt: now,
  }

  requests.unshift(newReq)
  writeCustomRequests(requests)

  // Asynchronously sync to Supabase if custom_requests table exists
  try {
    const dbRow = {
      id: newReq.id,
      customer_id: newReq.customerId,
      customer_name: newReq.customerName,
      customer_email: newReq.customerEmail,
      customer_phone: newReq.customerPhone,
      product_id: newReq.productId,
      product_name: newReq.productName,
      product_url: newReq.productUrl,
      seating_capacity: newReq.seatingCapacity,
      dimensions: newReq.dimensions,
      material: newReq.material,
      fabric: newReq.fabric,
      color: newReq.color,
      budget: newReq.budget,
      notes: newReq.notes,
      status: newReq.status,
      admin_notes: newReq.adminNotes,
      created_at: newReq.createdAt,
      updated_at: newReq.updatedAt,
    }

    Promise.resolve(
      supabase.from('custom_requests').insert([dbRow])
    ).then((res: any) => {
      if (res?.error) console.warn('[Supabase Custom Request Insert Notice]:', res.error.message)
      else console.log(`[Supabase Custom Request Synced]: ${newReq.id}`)
    }).catch((err: any) => console.warn('[Supabase Custom Request Error]:', err))
  } catch (err) {
    console.warn('[Supabase Custom Request Exception]:', err)
  }

  return newReq
}

export async function updateCustomRequestStatus(
  id: string,
  updates: { status?: CustomRequestStatus; adminNotes?: string },
): Promise<CustomRequest | null> {
  const requests = readCustomRequests()
  const idx = requests.findIndex((r) => r.id === id)
  if (idx === -1) return null

  const existing = requests[idx]
  const updated: CustomRequest = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }
  requests[idx] = updated
  writeCustomRequests(requests)

  // Sync to Supabase
  try {
    supabase
      .from('custom_requests')
      .update({
        status: updated.status,
        admin_notes: updated.adminNotes,
        updated_at: updated.updatedAt,
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('[Supabase Custom Request Update Notice]:', error.message)
      })
  } catch {}

  return updated
}
