import { randomBytes } from 'node:crypto'
import { products } from '../src/data/products.ts'
import { effectiveSellingPrice } from '../src/lib/product-pricing.ts'
import { applyFileCouponDiscount, findCouponByCode, redeemPersonalCoupon } from './marketing-store.ts'
import { DEMO_COUPON } from '../src/data/site.ts'
import type { Address } from './auth-store.ts'
import { findById } from './auth-store.ts'
import { supabase } from './supabase-client.ts'
import { linkCustomRequestOrder } from './custom-request-store.ts'

/** Satisfies order_items FK; display name comes from order line + customization. */
export const BESPOKE_COMMISSION_PRODUCT_ID = 'prod_bespoke_commission'

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

export function normaliseOrder(row: any): Order {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id ?? row.customerId,
    createdAt: row.created_at ?? row.createdAt,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    coupon: row.coupon ?? null,
    paymentStatus: row.payment_status ?? row.paymentStatus ?? 'pending',
    fulfilmentStatus: row.fulfilment_status ?? row.fulfilmentStatus ?? 'placed',
    shippingAddress: row.address ?? row.shippingAddress ?? null,
    deliveryMethod: row.delivery_method ?? row.deliveryMethod ?? null,
    trackingNumber: row.tracking_number ?? row.trackingNumber ?? null,
    estimatedDelivery: row.estimated_delivery ?? row.estimatedDelivery ?? null,
    contact: row.contact ?? null,
    cartFingerprint: row.checkout_key ?? row.cartFingerprint ?? '',
    amountPaise: Math.round((Number(row.total) || 0) * 100),
    razorpayOrderId: row.razorpay_order_id ?? row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpay_payment_id ?? row.razorpayPaymentId ?? null,
    paymentError: row.payment_error ?? row.paymentError ?? null,
    paymentMethod: row.payment_method ?? row.paymentMethod ?? null,
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

export async function listOrdersForCustomer(customerId: string) {
  const customer = await findById(customerId)
  const email = customer?.email?.toLowerCase().trim() || ''

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load orders: ${error.message}`)

  const byId = (data ?? []).map(normaliseOrder)
  const seen = new Set(byId.map((o) => o.id))

  if (email) {
    const { data: emailRows, error: emailError } = await supabase
      .from('orders')
      .select('*')
      .ilike('contact->>email', email)
      .order('created_at', { ascending: false })
    if (!emailError && emailRows?.length) {
      for (const row of emailRows) {
        if (!seen.has(row.id)) {
          seen.add(row.id)
          byId.push(normaliseOrder(row))
        }
      }
      byId.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }

  return byId
}

export async function listAllOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load orders: ${error.message}`)
  return (data ?? []).map(normaliseOrder)
}

export async function getOrderForCustomer(customerId: string, orderId: string) {
  const customer = await findById(customerId)
  const email = customer?.email?.toLowerCase().trim() || ''

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) throw new Error(`Could not load order: ${error.message}`)
  if (data) return normaliseOrder(data)

  if (!email) return null

  const { data: byEmail, error: emailError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .ilike('contact->>email', email)
    .maybeSingle()
  if (emailError) throw new Error(`Could not load order: ${emailError.message}`)
  return byEmail ? normaliseOrder(byEmail) : null
}

export async function getOrderByNumberForCustomer(customerId: string, number: string) {
  const customer = await findById(customerId)
  const email = customer?.email?.toLowerCase().trim() || ''
  const trimmed = number.trim()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('number', trimmed)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) throw new Error(`Could not load order: ${error.message}`)
  if (data) return normaliseOrder(data)

  if (!email) return null

  const { data: byEmail, error: emailError } = await supabase
    .from('orders')
    .select('*')
    .eq('number', trimmed)
    .ilike('contact->>email', email)
    .maybeSingle()
  if (emailError) throw new Error(`Could not load order: ${emailError.message}`)
  return byEmail ? normaliseOrder(byEmail) : null
}

async function customerPayload(customerId: string) {
  if (!customerId || customerId === 'guest') throw new Error('A signed-in customer is required.')
  const localUser = await findById(customerId)
  if (!localUser) throw new Error('Customer account could not be found.')
  return {
    id: localUser.id,
    name: localUser.name,
    email: localUser.email,
    phone: localUser.phone || '',
    password_hash: localUser.passwordHash || 'synced_customer',
    email_verified: localUser.emailVerified ?? true,
    addresses: localUser.addresses || [],
    created_at: localUser.createdAt || new Date().toISOString(),
  }
}

export type CartStockIssue = {
  productId: string
  productName: string
  requested: number
  available: number
  madeToOrder: boolean
  reason: 'insufficient_stock' | 'out_of_stock' | 'not_found' | 'unpublished'
}

function resolveProductStock(dbP: any | undefined, fallbackP: (typeof products)[number] | undefined) {
  const stock = Number(
    dbP != null
      ? dbP.ready_to_ship_stock ?? dbP.readyToShipStock ?? 0
      : fallbackP != null
        ? fallbackP.readyToShipStock ?? 0
        : 0,
  )
  const isMadeToOrder = Boolean(
    dbP != null ? (dbP.made_to_order ?? dbP.madeToOrder ?? true) : fallbackP != null ? (fallbackP.madeToOrder ?? true) : true,
  )
  return { stock, isMadeToOrder }
}

export async function validateCartLines(items: Array<{ productId: string; quantity: number }>) {
  const { data: dbProducts } = await supabase.from('products').select('id,name,ready_to_ship_stock,made_to_order,status')
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : []
  const issues: CartStockIssue[] = []

  for (const line of items) {
    if (line.quantity < 1) continue
    const dbP = liveCatalog.find((entry: any) => entry.id === line.productId)
    const fallbackP = products.find((entry) => entry.id === line.productId)
    const p = dbP || fallbackP
    if (!p) {
      issues.push({
        productId: line.productId,
        productName: line.productId,
        requested: line.quantity,
        available: 0,
        madeToOrder: true,
        reason: 'not_found',
      })
      continue
    }
    if (dbP && dbP.status && dbP.status !== 'published') {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: 0,
        madeToOrder: false,
        reason: 'unpublished',
      })
      continue
    }
    const { stock, isMadeToOrder } = resolveProductStock(dbP, fallbackP)
    if (isMadeToOrder) continue
    if (stock <= 0) {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: 0,
        madeToOrder: false,
        reason: 'out_of_stock',
      })
    } else if (line.quantity > stock) {
      issues.push({
        productId: line.productId,
        productName: String(p.name),
        requested: line.quantity,
        available: stock,
        madeToOrder: false,
        reason: 'insufficient_stock',
      })
    }
  }

  if (issues.length) return { ok: false as const, issues }
  return { ok: true as const, issues: [] as CartStockIssue[] }
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
  const stockCheck = await validateCartLines(input.items.map((line) => ({ productId: line.productId, quantity: line.quantity })))
  if (!stockCheck.ok) {
    const first = stockCheck.issues[0]
    const message =
      first.reason === 'out_of_stock'
        ? `"${first.productName}" is out of stock. Remove it from your bag or choose made-to-order pieces.`
        : first.reason === 'insufficient_stock'
          ? `Only ${first.available} unit${first.available === 1 ? '' : 's'} left for "${first.productName}" — you asked for ${first.requested}.`
          : first.reason === 'not_found'
            ? 'An item in your bag is no longer available.'
            : `"${first.productName}" is not available to buy right now.`
    return {
      error: 'insufficient_stock' as const,
      message,
      productId: first.productId,
      productName: first.productName,
      availableStock: first.available,
      requestedQuantity: first.requested,
      issues: stockCheck.issues,
    }
  }

  // 1. Fetch live product details and availability from Supabase
  const { data: dbProducts } = await supabase.from('products').select('*')
  const liveCatalog = dbProducts && dbProducts.length > 0 ? dbProducts : []

  const items: OrderItem[] = []
  for (const line of input.items) {
    const dbP = liveCatalog.find((entry: any) => entry.id === line.productId)
    const fallbackP = products.find((entry) => entry.id === line.productId)
    const p = dbP || fallbackP
    if (!p || line.quantity < 1) continue

    const { stock, isMadeToOrder } = resolveProductStock(dbP, fallbackP)

    if (!isMadeToOrder && line.quantity > stock) {
      return {
        error: 'insufficient_stock' as const,
        message: `Only ${stock} unit${stock === 1 ? '' : 's'} available in stock for "${p.name}".`,
        productId: line.productId,
        productName: String(p.name),
        availableStock: stock,
        requestedQuantity: line.quantity,
      }
    }

    const festivePct = Number(dbP?.festive_discount_percent ?? fallbackP?.festiveDiscountPercent) || 0
    const basePrice = effectiveSellingPrice(Number(p.price) || 0, festivePct)
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
    } else {
      const fileCoupon = findCouponByCode(code)
      if (fileCoupon) {
        const applied = applyFileCouponDiscount(fileCoupon, subtotal, customerId)
        if (applied.ok) {
          appliedCoupon = code
          discount = applied.discount
        }
      }
    }
  }

  const coupon = appliedCoupon
  const total = Math.max(0, subtotal - discount)
  const order: Order = {
    id: randomBytes(10).toString('hex'),
    number: `CK${randomBytes(8).toString('hex').toUpperCase()}`,
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

  const customer = await customerPayload(customerId)
  const checkoutKey = input.cartFingerprint || `${customerId}:${order.id}`
  const { data, error } = await supabase.rpc('create_order_transaction', {
    p_customer: customer,
    p_order: {
      ...order,
      address: order.shippingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      fulfilment_status: order.fulfilmentStatus,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      checkout_key: checkoutKey,
    },
    p_items: order.items,
  })
  if (error) throw new Error(`Could not save order: ${error.message}`)
  if (!data) throw new Error('Could not save order: the database returned no order.')
  let saved = normaliseOrder(data)
  const tracking = nextTrackingNumber(saved)
  const { data: patched, error: patchError } = await supabase
    .from('orders')
    .update({
      tracking_number: tracking,
      estimated_delivery: saved.estimatedDelivery || saved.createdAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saved.id)
    .select('*')
    .maybeSingle()
  if (!patchError && patched) saved = normaliseOrder(patched)
  else saved = { ...saved, trackingNumber: tracking, estimatedDelivery: saved.estimatedDelivery || saved.createdAt }
  return { order: saved }
}

export function tryRedeemOrderCoupon(customerId: string, couponCode: string | null | undefined) {
  if (!couponCode?.trim()) return
  const fileCoupon = findCouponByCode(couponCode)
  if (fileCoupon?.personal) redeemPersonalCoupon(couponCode, customerId)
}

export async function findReusableCheckoutOrder(customerId: string, fingerprint: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .eq('checkout_key', fingerprint)
    .neq('payment_status', 'paid')
    .neq('payment_status', 'refunded')
    .neq('payment_status', 'failed')
    .maybeSingle()
  if (error) throw new Error(`Could not check for an existing checkout: ${error.message}`)
  return data ? normaliseOrder(data) : null
}

export async function attachRazorpayOrder(orderId: string, customerId: string, razorpayOrderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ razorpay_order_id: razorpayOrderId, payment_status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .neq('payment_status', 'paid')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`Could not attach payment order: ${error.message}`)
  return data ? normaliseOrder(data) : null
}

export async function markOrderPaymentFailed(orderId: string, customerId: string, message: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: 'failed', payment_error: message, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .neq('payment_status', 'paid')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`Could not save payment failure: ${error.message}`)
  return data ? normaliseOrder(data) : null
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
  const { data, error } = await supabase.rpc('mark_order_paid_transaction', {
    p_order_id: input.orderId,
    p_customer_id: customerId,
    p_razorpay_order_id: input.razorpayOrderId,
    p_razorpay_payment_id: input.razorpayPaymentId,
    p_payment_method: input.paymentMethod ?? 'razorpay',
    p_delivery_method: input.deliveryMethod ?? null,
  })
  if (error) throw new Error(`Could not save payment: ${error.message}`)
  if (!data) return { error: 'missing' as const }
  return { order: normaliseOrder(data) }
}

export async function markCashOnDelivery(
  customerId: string,
  input: { orderId: string; razorpayOrderId: string },
) {
  const { data, error } = await supabase.rpc('mark_order_cash_transaction', {
    p_order_id: input.orderId,
    p_customer_id: customerId,
    p_razorpay_order_id: input.razorpayOrderId,
  })
  if (error) throw new Error(`Could not save cash-on-delivery order: ${error.message}`)
  return data ? { order: normaliseOrder(data) } : { error: 'missing' as const }
}

export async function createOrderFromBespokeQuote(
  customerId: string,
  input: {
    customRequestId: string
    productName: string
    productId?: string
    image?: string
    quoteAmount: number
    contact: OrderContact
    address: Address | null
  },
) {
  const amount = Math.round(Number(input.quoteAmount))
  if (!Number.isFinite(amount) || amount < 1) {
    return { error: 'invalid_quote' as const, message: 'A valid commission amount is required.' }
  }

  await supabase.from('products').upsert(
    [
      {
        id: BESPOKE_COMMISSION_PRODUCT_ID,
        slug: 'bespoke-commission',
        name: 'Bespoke atelier commission',
        sku: 'CK-BESPOKE',
        price: 0,
        category: 'Custom',
        category_id: 'cat_sofas',
        space: 'living',
        status: 'archived',
        made_to_order: true,
        ready_to_ship_stock: 0,
      },
    ],
    { onConflict: 'id' },
  )

  const checkoutKey = `bespoke:${input.customRequestId}`
  const reuse = await findReusableCheckoutOrder(customerId, checkoutKey)
  if (reuse) {
    await linkCustomRequestOrder(input.customRequestId, reuse.id)
    return { order: reuse }
  }

  const items: OrderItem[] = [
    {
      productId: BESPOKE_COMMISSION_PRODUCT_ID,
      name: `Bespoke · ${input.productName}`,
      slug: 'bespoke-commission',
      image: input.image || '/hero-living-hd.jpg',
      finish: 'Atelier commission',
      quantity: 1,
      unitPrice: amount,
      customization: {
        customRequestId: input.customRequestId,
        type: 'bespoke',
        sourceProductId: input.productId || null,
      },
    },
  ]

  const subtotal = amount
  const order: Order = {
    id: randomBytes(10).toString('hex'),
    number: `CK${randomBytes(8).toString('hex').toUpperCase()}`,
    customerId,
    createdAt: new Date().toISOString(),
    items,
    subtotal,
    discount: 0,
    total: subtotal,
    coupon: null,
    paymentStatus: 'pending',
    fulfilmentStatus: 'placed',
    shippingAddress: input.address,
    deliveryMethod: null,
    trackingNumber: null,
    estimatedDelivery: null,
    contact: input.contact,
    cartFingerprint: checkoutKey,
    amountPaise: Math.round(subtotal * 100),
    razorpayOrderId: null,
    razorpayPaymentId: null,
    paymentError: null,
    paymentMethod: null,
  }

  const customer = await customerPayload(customerId)
  const { data, error } = await supabase.rpc('create_order_transaction', {
    p_customer: customer,
    p_order: {
      ...order,
      address: order.shippingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      fulfilment_status: order.fulfilmentStatus,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      checkout_key: checkoutKey,
    },
    p_items: order.items,
  })
  if (error) throw new Error(`Could not save commission order: ${error.message}`)
  if (!data) throw new Error('Could not save commission order: the database returned no order.')
  let saved = normaliseOrder(data)
  const tracking = nextTrackingNumber(saved)
  const { data: patched, error: patchError } = await supabase
    .from('orders')
    .update({
      tracking_number: tracking,
      estimated_delivery: saved.estimatedDelivery || saved.createdAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saved.id)
    .select('*')
    .maybeSingle()
  if (!patchError && patched) saved = normaliseOrder(patched)
  else saved = { ...saved, trackingNumber: tracking, estimatedDelivery: saved.estimatedDelivery || saved.createdAt }

  await linkCustomRequestOrder(input.customRequestId, saved.id)
  return { order: saved }
}
