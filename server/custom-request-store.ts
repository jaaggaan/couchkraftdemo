import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'
import { supabase } from './supabase-client.ts'
import { isAllowedReferenceImageUrl } from './storage-upload.ts'

export type CustomRequestStatus = 'new' | 'under_review' | 'quoted' | 'approved' | 'archived'
export type CustomRequestPaymentStatus = 'none' | 'awaiting' | 'paid'

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
  referenceImages?: string[]
  status: CustomRequestStatus
  adminNotes?: string
  quoteAmount?: number | null
  paymentStatus?: CustomRequestPaymentStatus
  linkedOrderId?: string | null
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
  if (process.env.VERCEL) return []
  ensureRequestsFile()
  try {
    const raw = readFileSync(requestsFile, 'utf8')
    return JSON.parse(raw) as CustomRequest[]
  } catch {
    return []
  }
}

/** Admin + dashboard: Supabase is source of truth on Vercel; local JSON merged when present. */
export async function listAllCustomRequests(): Promise<CustomRequest[]> {
  const map = new Map<string, CustomRequest>()
  for (const row of readCustomRequests()) {
    map.set(row.id, row)
  }

  try {
    const { data, error } = await supabase
      .from('custom_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data?.length) {
      for (const row of data) {
        const remote = fromDbRow(row as Record<string, unknown>)
        const local = map.get(remote.id)
        map.set(remote.id, local ? mergeRequests(local, remote) : remote)
      }
    } else if (error) {
      console.warn('[CustomRequests] Supabase listAll:', error.message)
    }
  } catch (err) {
    console.warn('[CustomRequests] Supabase listAll:', err)
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

async function getCustomRequestById(id: string): Promise<CustomRequest | null> {
  const local = readCustomRequests().find((r) => r.id === id)
  if (local) return local
  try {
    const { data, error } = await supabase.from('custom_requests').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    return fromDbRow(data as Record<string, unknown>)
  } catch {
    return null
  }
}

async function persistCustomRequest(updated: CustomRequest): Promise<CustomRequest> {
  if (!process.env.VERCEL) {
    const requests = readCustomRequests()
    const idx = requests.findIndex((r) => r.id === updated.id)
    if (idx === -1) requests.unshift(updated)
    else requests[idx] = updated
    writeCustomRequests(requests)
  }

  const { error } = await supabase
    .from('custom_requests')
    .update({
      status: updated.status,
      admin_notes: updated.adminNotes,
      quote_amount: updated.quoteAmount ?? null,
      payment_status: updated.paymentStatus || 'none',
      linked_order_id: updated.linkedOrderId ?? null,
      updated_at: updated.updatedAt,
    })
    .eq('id', updated.id)
  if (error) console.warn('[Supabase Custom Request Update]:', error.message)
  return updated
}

export function writeCustomRequests(items: CustomRequest[]) {
  ensureRequestsFile()
  writeFileSync(requestsFile, JSON.stringify(items, null, 2), 'utf8')
}

function fromDbRow(row: Record<string, unknown>): CustomRequest {
  const dimensions = (row.dimensions as CustomRequest['dimensions']) || {}
  const refFromDims = Array.isArray((dimensions as { referenceImages?: string[] }).referenceImages)
    ? (dimensions as { referenceImages: string[] }).referenceImages
    : []
  return {
    id: String(row.id),
    customerId: (row.customer_id as string | null) ?? null,
    customerName: String(row.customer_name || ''),
    customerEmail: row.customer_email ? String(row.customer_email) : undefined,
    customerPhone: String(row.customer_phone || ''),
    productId: row.product_id ? String(row.product_id) : undefined,
    productName: row.product_name ? String(row.product_name) : undefined,
    productUrl: row.product_url ? String(row.product_url) : undefined,
    seatingCapacity: row.seating_capacity ? String(row.seating_capacity) : undefined,
    dimensions,
    material: row.material ? String(row.material) : undefined,
    fabric: row.fabric ? String(row.fabric) : undefined,
    color: row.color ? String(row.color) : undefined,
    budget: row.budget ? String(row.budget) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    referenceImages: refFromDims.length
      ? refFromDims.filter((u) => isAllowedReferenceImageUrl(u))
      : undefined,
    status: (row.status as CustomRequestStatus) || 'new',
    adminNotes: row.admin_notes ? String(row.admin_notes) : '',
    quoteAmount: row.quote_amount != null ? Number(row.quote_amount) : null,
    paymentStatus: (row.payment_status as CustomRequestPaymentStatus) || 'none',
    linkedOrderId: row.linked_order_id ? String(row.linked_order_id) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function mergeRequests(local: CustomRequest, remote: CustomRequest): CustomRequest {
  const remoteNewer = new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()
  return {
    ...local,
    ...remote,
    referenceImages: remote.referenceImages?.length ? remote.referenceImages : local.referenceImages,
    status: remoteNewer ? remote.status : local.status,
    adminNotes: remoteNewer ? remote.adminNotes : local.adminNotes,
    quoteAmount: remote.quoteAmount != null ? remote.quoteAmount : local.quoteAmount,
    paymentStatus: remoteNewer ? remote.paymentStatus : local.paymentStatus,
    linkedOrderId: remote.linkedOrderId || local.linkedOrderId,
    updatedAt: remoteNewer ? remote.updatedAt : local.updatedAt,
  }
}

export async function listCustomRequestsForCustomer(customerId: string): Promise<CustomRequest[]> {
  const map = new Map<string, CustomRequest>()
  for (const row of readCustomRequests().filter((r) => r.customerId === customerId)) {
    map.set(row.id, row)
  }

  try {
    const { data, error } = await supabase
      .from('custom_requests')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    if (!error && data?.length) {
      for (const row of data) {
        const remote = fromDbRow(row as Record<string, unknown>)
        const local = map.get(remote.id)
        map.set(remote.id, local ? mergeRequests(local, remote) : remote)
      }
    }
  } catch (err) {
    console.warn('[CustomRequests] Supabase list:', err)
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function getCustomRequestForCustomer(
  customerId: string,
  requestId: string,
): Promise<CustomRequest | null> {
  const list = await listCustomRequestsForCustomer(customerId)
  return list.find((r) => r.id === requestId) ?? null
}

export async function createCustomRequest(input: Partial<CustomRequest>): Promise<CustomRequest> {
  const requests = readCustomRequests()
  const id = `CK-REQ-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
  const now = new Date().toISOString()

  const referenceImages = Array.isArray(input.referenceImages)
    ? input.referenceImages.filter((u) => typeof u === 'string' && isAllowedReferenceImageUrl(u)).slice(0, 6)
    : undefined
  const dimensions = {
    ...(input.dimensions && typeof input.dimensions === 'object' ? input.dimensions : {}),
    ...(referenceImages?.length ? { referenceImages } : {}),
  }

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
    dimensions,
    material: input.material || undefined,
    fabric: input.fabric || undefined,
    color: input.color || undefined,
    budget: input.budget || undefined,
    notes: input.notes || undefined,
    referenceImages,
    status: 'new',
    adminNotes: '',
    quoteAmount: null,
    paymentStatus: 'none',
    linkedOrderId: null,
    createdAt: now,
    updatedAt: now,
  }

  if (!process.env.VERCEL) {
    requests.unshift(newReq)
    writeCustomRequests(requests)
  }

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
      dimensions: {
        ...(newReq.dimensions || {}),
        ...(newReq.referenceImages?.length ? { referenceImages: newReq.referenceImages } : {}),
      },
      material: newReq.material,
      fabric: newReq.fabric,
      color: newReq.color,
      budget: newReq.budget,
      notes: newReq.notes,
      status: newReq.status,
      admin_notes: newReq.adminNotes,
      quote_amount: newReq.quoteAmount ?? null,
      payment_status: newReq.paymentStatus || 'none',
      linked_order_id: newReq.linkedOrderId ?? null,
      created_at: newReq.createdAt,
      updated_at: newReq.updatedAt,
    }

    const { error } = await supabase.from('custom_requests').insert([dbRow])
    if (error) {
      console.warn('[Supabase Custom Request Insert]:', error.message)
      if (process.env.VERCEL) {
        throw new Error(`Could not save custom request: ${error.message}`)
      }
    }
  } catch (err) {
    console.warn('[Supabase Custom Request Exception]:', err)
    if (process.env.VERCEL && err instanceof Error) throw err
  }

  return newReq
}

async function patchCustomRequest(id: string, patch: Partial<CustomRequest>): Promise<CustomRequest | null> {
  const existing = await getCustomRequestById(id)
  if (!existing) return null
  const updated: CustomRequest = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }
  return persistCustomRequest(updated)
}

export async function updateCustomRequestStatus(
  id: string,
  updates: { status?: CustomRequestStatus; adminNotes?: string; quoteAmount?: number | null },
): Promise<CustomRequest | null> {
  const existing = await getCustomRequestById(id)
  if (!existing) return null

  let quoteAmount = updates.quoteAmount
  if (quoteAmount === undefined) quoteAmount = existing.quoteAmount
  if (typeof quoteAmount === 'number' && quoteAmount < 0) quoteAmount = null

  const updated: CustomRequest = {
    ...existing,
    status: updates.status ?? existing.status,
    adminNotes: updates.adminNotes ?? existing.adminNotes,
    quoteAmount: quoteAmount ?? null,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }
  return persistCustomRequest(updated)
}

export async function linkCustomRequestOrder(requestId: string, orderId: string) {
  return patchCustomRequest(requestId, {
    linkedOrderId: orderId,
    paymentStatus: 'awaiting',
  })
}

export async function markCustomRequestPaid(requestId: string, orderId: string) {
  return patchCustomRequest(requestId, {
    linkedOrderId: orderId,
    paymentStatus: 'paid',
  })
}

export function customRequestIdFromOrderItems(items: Array<{ customization?: unknown }>): string | null {
  for (const item of items) {
    const c = item.customization as { customRequestId?: string } | undefined
    if (c?.customRequestId) return c.customRequestId
  }
  return null
}

export async function markCustomRequestPaidFromOrder(order: {
  id: string
  items: Array<{ customization?: unknown }>
  paymentStatus?: string
}) {
  if (order.paymentStatus !== 'paid') return
  const requestId = customRequestIdFromOrderItems(order.items)
  if (!requestId) return
  await markCustomRequestPaid(requestId, order.id)
}
