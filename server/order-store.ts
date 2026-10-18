import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'
import { products } from '../src/data/products.ts'
import { DEMO_COUPON } from '../src/data/site.ts'
import type { Address } from './auth-store.ts'
import { findById } from './auth-store.ts'
import { supabase } from './supabase-client.ts'

export const FULFILMENT_STEPS = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
] as const

export type FulfilmentStatus = (typeof FULFILMENT_STEPS)[number]
export type PaymentStatus = 'pending' | 'unpaid' | 'paid' | 'failed' | 'refunded'

export type OrderContact = {
  name: string
  email: string
  phone: string
}

export type OrderItem = {
  productId: string
  name: string
  slug: string
  image: string
  finish: string
  quantity: number
  unitPrice: number
  customization?: any
}

export type Order = {
  id: string
  number: string
  customerId: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  coupon: string | null
  paymentStatus: PaymentStatus
  fulfilmentStatus: FulfilmentStatus
  shippingAddress: Address | null
  deliveryMethod: string | null
  trackingNumber: string | null
  estimatedDelivery: string | null
  contact: OrderContact | null
  cartFingerprint: string
  amountPaise: number
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  paymentError: string | null
  paymentMethod: string | null
}

const dataDir = dataDirectory()
const storePath = resolve(dataDir, 'orders.json')

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(storePath)) writeFileSync(storePath, '[]', 'utf8')
}

function readAll(): Order[] {
  ensureStore()
  try {
    return (JSON.parse(readFileSync(storePath, 'utf8')) as Order[]).map(normaliseOrder)
  } catch {
    return []
  }
}

function normaliseOrder(order: Order): Order {
  return {
    ...order,
    contact: order.contact ?? null,
    cartFingerprint: order.cartFingerprint ?? '',
    amountPaise: order.amountPaise ?? Math.round((order.total || 0) * 100),
    razorpayOrderId: order.razorpayOrderId ?? null,
    razorpayPaymentId: order.razorpayPaymentId ?? null,
    paymentError: order.paymentError ?? null,
    paymentMethod: order.paymentMethod ?? null,
  }
}

export function nextTrackingNumber(order: Order) {
  if (order.trackingNumber) return order.trackingNumber
  const digits = order.number.replace(/\D/g, '') || '000000'
  return `CKTRK${digits}${order.id.slice(-4).toUpperCase()}`
}

export function cartFingerprint(
  items: Array<{ productId: string; quantity: number; finish?: string }>,
  coupon: string | null | undefined,
  destination: string,
) {
  const norm = items
    .map((item) => `${item.productId}:${item.quantity}:${item.finish ?? ''}`)
    .sort()
    .join(';')
  return `${norm}|${(coupon || '').trim().toUpperCase()}|${destination.trim().toLowerCase()}`
}

function writeAll(orders: Order[]) {
  ensureStore()
  writeFileSync(storePath, JSON.stringify(orders, null, 2), 'utf8')
}

export function listOrdersForCustomer(customerId: string) {
  return readAll()
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getOrderForCustomer(customerId: string, orderId: string) {
  const local = listOrdersForCustomer(customerId).find((order) => order.id === orderId)
  return local ?? null
}

export function getOrderByNumberForCustomer(customerId: string, number: string) {
  const cleaned = number.trim().toUpperCase()
  return (
    listOrdersForCustomer(customerId).find(
      (order) => order.number.toUpperCase() === cleaned,
    ) ?? null
  )
}

async function ensureCustomerInSupabase(customerId: string): Promise<string | null> {
  if (!customerId || customerId === 'guest') return null
  try {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .maybeSingle()
    if (existing?.id) return existing.id

    const localUser = await findById(customerId)
    if (localUser) {
      const { data: inserted, error } = await supabase.from('customers').insert([{
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        phone: localUser.phone || '',
        password_hash: localUser.passwordHash || 'synced_customer',
        email_verified: localUser.emailVerified ?? true,
        addresses: localUser.addresses || [],
        created_at: localUser.createdAt || new Date().toISOString(),
      }]).select()
      if (!error && inserted?.[0]) return inserted[0].id
    }
  } catch (err) {
    console.warn('[Supabase Customer Link Warning]:', err)
  }
  return null
}

export async function persistOrderToSupabase(order: Order) {
  try {
    const validCustomerId = await ensureCustomerInSupabase(order.customerId)
    const dbOrder = {
      id: order.id,
      number: order.number,
      customer_id: validCustomerId,
      items: order.items,
      address: order.shippingAddress,
      coupon: order.coupon,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: 0,
      tax: 0,
      total: order.total,
      payment_method: order.paymentMethod || 'demo',
      payment_status: order.paymentStatus || 'pending',
      fulfilment_status: order.fulfilmentStatus || 'placed',
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      created_at: order.createdAt,
      updated_at: new Date().toISOString(),
    }

    const { error: oErr } = await supabase.from('orders').upsert([dbOrder], { onConflict: 'id' })
    if (oErr) {
      console.error('[Supabase Order Upsert Error]:', oErr.message)
    } else {
      console.log(`[Supabase Order Saved]: ${order.number} (${order.paymentStatus})`)
    }

    // Attempt order_items insertion
    if (Array.isArray(order.items) && order.items.length) {
      const dbItems = order.items.map((it, idx) => ({
        id: `item_${order.id}_${idx}`,
        order_id: order.id,
        product_id: it.productId,
        quantity: it.quantity,
        price_at_purchase: it.unitPrice,
        product_name_snapshot: it.name || 'Artisanal Piece',
        product_sku_snapshot: it.productId || '',
        variant_details: { finish: it.finish, customization: it.customization },
      }))
      const { error: iErr } = await supabase.from('order_items').upsert(dbItems, { onConflict: 'id' })
      if (iErr) {
        console.warn('[Supabase Order Items Notice]:', iErr.message)
      }
    }
  } catch (err) {
    console.error('[Supabase Order Sync Exception]:', err)
  }
}

async function decrementPurchasedStock(items: OrderItem[]) {
  try {
    for (const item of items) {
      const { data: prod } = await supabase
        .from('products')
        .select('id, ready_to_ship_stock, made_to_order')
        .eq('id', item.productId)
        .maybeSingle()
      if (prod && !prod.made_to_order) {
        const currentStock = Number(prod.ready_to_ship_stock) || 0
        const newStock = Math.max(0, currentStock - item.quantity)
        await supabase.from('products').update({ ready_to_ship_stock: newStock }).eq('id', item.productId)
        console.log(`[Supabase Stock Decremented]: Product ${item.productId} stock updated from ${currentStock} to ${newStock}`)
      }
    }
  } catch (err) {
    console.warn('[Supabase Stock Decrement Notice]:', err)
  }
}

export async function createOrderFromCart(
  customerId: string,
  input: {
    items: Array<{ productId: string; quantity: number; finish?: string; customization?: any }>
    address: Address | null
    coupon?: string | null
    contact?: OrderContact | null
    paymentStatus?: PaymentStatus
    cartFingerprint?: string
  },
) {
  // 1. Fetch live product details and availability from Supabase
  const { data: dbProducts } = await supabase.from('products').select('*')
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : []

  const items: OrderItem[] = []
  for (const line of input.items) {
    const dbP = liveCatalog.find((entry: any) => entry.id === line.productId)
    const fallbackP = products.find((entry) => entry.id === line.productId)
    const p = dbP || fallbackP
    if (!p || line.quantity < 1) continue

    const stock = Number(dbP ? (dbP.ready_to_ship_stock ?? dbP.readyToShipStock) : 10)
    const isMadeToOrder = Boolean(dbP ? (dbP.made_to_order ?? dbP.madeToOrder) : true)

    if (!isMadeToOrder && line.quantity > stock) {
      return {
        error: 'insufficient_stock' as const,
        message: `Only ${stock} unit${stock === 1 ? '' : 's'} available in stock for "${p.name}".`,
      }
    }

    const basePrice = Number(p.price) || 0
    const images = Array.isArray(p.images) ? p.images : []
    const finishes = Array.isArray(p.finishes) ? p.finishes : ['Standard']

    let itemPrice = basePrice
    let validatedCustomization: any = undefined

    if (line.customization && typeof line.customization === 'object') {
      const customConfig = (dbP?.customization_options ?? fallbackP?.customizationOptions) || {}
      let delta = 0
      const c = line.customization

      // Validate seating option
      if (c.seating && Array.isArray(customConfig.seatingOptions)) {
        const found = customConfig.seatingOptions.find((opt: any) => opt.id === c.seating || opt.label === c.seating)
        if (found) delta += Number(found.priceDelta) || 0
      }

      // Validate dimensions extra per unit
      if (c.width && customConfig.dimensionSpecs?.width) {
        const wSpec = customConfig.dimensionSpecs.width
        if (wSpec.pricePerUnitDelta && Number(c.width) > wSpec.defaultVal) {
          const over = Math.max(0, Number(c.width) - wSpec.defaultVal)
          delta += over * Number(wSpec.pricePerUnitDelta)
        }
      }

      // Validate fabric
      if (c.fabric && Array.isArray(customConfig.fabrics)) {
        const found = customConfig.fabrics.find((opt: any) => opt.id === c.fabric || opt.label === c.fabric)
        if (found) delta += Number(found.priceDelta) || 0
      }

      // Validate color
      if (c.color && Array.isArray(customConfig.colors)) {
        const found = customConfig.colors.find((opt: any) => opt.id === c.color || opt.label === c.color || opt.name === c.color)
        if (found) delta += Number(found.priceDelta) || 0
      }

      // Validate finish
      if (c.finish && Array.isArray(customConfig.finishes)) {
        const found = customConfig.finishes.find((opt: any) => opt.id === c.finish || opt.label === c.finish)
        if (found) delta += Number(found.priceDelta) || 0
      }

      // Validate material
      if (c.material && Array.isArray(customConfig.materials)) {
        const found = customConfig.materials.find((opt: any) => opt.id === c.material || opt.label === c.material)
        if (found) delta += Number(found.priceDelta) || 0
      }

      validatedCustomization = {
        ...c,
        totalCustomizationDelta: delta,
      }
      itemPrice = Math.max(0, basePrice + delta)
    }

    items.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: images[0] || fallbackP?.images[0] || '/hero-living-hd.jpg',
      finish: line.finish || finishes[0] || 'Standard',
      quantity: Math.round(line.quantity),
      unitPrice: itemPrice,
      customization: validatedCustomization,
    })
  }
  if (!items.length) return { error: 'empty' as const }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  // 2. Validate coupon against Supabase coupons table
  let appliedCoupon: string | null = null
  let discount = 0
  if (input.coupon?.trim()) {
    const code = input.coupon.trim().toUpperCase()
    const { data: dbCoupons } = await supabase.from('coupons').select('*').eq('active', true)
    const foundCoupon = dbCoupons?.find((c: any) => c.code.toUpperCase() === code)
    if (foundCoupon) {
      const minVal = Number(foundCoupon.min_order_value) || 0
      if (subtotal >= minVal) {
        appliedCoupon = code
        if (foundCoupon.type === 'percent') {
          const calc = Math.round(subtotal * (Number(foundCoupon.value) / 100))
          discount = foundCoupon.max_discount ? Math.min(calc, Number(foundCoupon.max_discount)) : calc
        } else {
          discount = Math.min(subtotal, Number(foundCoupon.value) || 0)
        }
      }
    } else if (code === DEMO_COUPON.code) {
      appliedCoupon = DEMO_COUPON.code
      discount = Math.round(subtotal * (DEMO_COUPON.percent / 100))
    }
  }

  const coupon = appliedCoupon
  const total = Math.max(0, subtotal - discount)
  const orders = readAll()
  const order: Order = {
    id: randomBytes(10).toString('hex'),
    number: `CK${String(orders.length + 10841).padStart(6, '0')}`,
    customerId,
    createdAt: new Date().toISOString(),
    items,
    subtotal,
    discount,
    total,
    coupon,
    paymentStatus: input.paymentStatus || 'unpaid',
    fulfilmentStatus: 'placed',
    shippingAddress: input.address,
    deliveryMethod: null,
    trackingNumber: null,
    estimatedDelivery: null,
    contact: input.contact ?? null,
    cartFingerprint: input.cartFingerprint || '',
    amountPaise: Math.round(total * 100),
    razorpayOrderId: null,
    razorpayPaymentId: null,
    paymentError: null,
    paymentMethod: null,
  }

  orders.push(order)
  writeAll(orders)

  // Persist order asynchronously to Supabase
  await persistOrderToSupabase(order)

  return { order }
}

export function findReusableCheckoutOrder(customerId: string, fingerprint: string) {
  return (
    listOrdersForCustomer(customerId).find(
      (order) =>
        order.cartFingerprint === fingerprint &&
        order.paymentStatus !== 'paid' &&
        order.paymentStatus !== 'refunded',
    ) ?? null
  )
}

export function saveOrder(next: Order) {
  const orders = readAll()
  const index = orders.findIndex((order) => order.id === next.id)
  if (index === -1) return null
  orders[index] = next
  writeAll(orders)
  return next
}

export function attachRazorpayOrder(orderId: string, customerId: string, razorpayOrderId: string) {
  const order = getOrderForCustomer(customerId, orderId)
  if (!order) return null
  const saved = saveOrder({
    ...order,
    paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
    razorpayOrderId,
    paymentError: null,
  })
  if (saved) {
    void persistOrderToSupabase(saved)
  }
  return saved
}

export function markOrderPaymentFailed(orderId: string, customerId: string, message: string) {
  const order = getOrderForCustomer(customerId, orderId)
  if (!order || order.paymentStatus === 'paid') return order
  const saved = saveOrder({
    ...order,
    paymentStatus: 'failed',
    paymentError: message,
  })
  if (saved) {
    void persistOrderToSupabase(saved)
  }
  return saved
}

export async function markOrderPaid(
  customerId: string,
  input: {
    orderId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    paymentMethod?: string | null
    deliveryMethod?: string | null
  },
) {
  const order = getOrderForCustomer(customerId, input.orderId)
  if (!order) return { error: 'missing' as const }
  if (order.razorpayOrderId !== input.razorpayOrderId) return { error: 'mismatch' as const }
  if (order.paymentStatus === 'paid') return { order }
  const paid = saveOrder({
    ...order,
    paymentStatus: 'paid',
    fulfilmentStatus: order.fulfilmentStatus === 'placed' ? 'confirmed' : order.fulfilmentStatus,
    razorpayPaymentId: input.razorpayPaymentId,
    paymentMethod: input.paymentMethod ?? order.paymentMethod,
    deliveryMethod: input.deliveryMethod ?? order.deliveryMethod,
    trackingNumber: nextTrackingNumber(order),
    paymentError: null,
  })
  if (!paid) return { error: 'missing' as const }

  // Persist paid status immediately to Supabase
  await persistOrderToSupabase(paid)

  // Decrement inventory stock for purchased ready-to-ship items
  await decrementPurchasedStock(paid.items)

  return { order: paid }
}

export async function markCashOnDelivery(
  customerId: string,
  input: { orderId: string; razorpayOrderId: string },
) {
  const order = getOrderForCustomer(customerId, input.orderId)
  if (!order) return { error: 'missing' as const }
  if (order.razorpayOrderId !== input.razorpayOrderId) return { error: 'mismatch' as const }
  if (order.paymentStatus === 'paid') return { order }
  const next = saveOrder({
    ...order,
    paymentStatus: 'pending',
    fulfilmentStatus: order.fulfilmentStatus === 'placed' ? 'confirmed' : order.fulfilmentStatus,
    paymentMethod: 'cash',
    deliveryMethod: 'Cash on delivery',
    trackingNumber: nextTrackingNumber(order),
    paymentError: null,
  })
  if (!next) return { error: 'missing' as const }

  await persistOrderToSupabase(next)

  // Decrement inventory stock for purchased ready-to-ship items
  await decrementPurchasedStock(next.items)

  return { order: next }
}
