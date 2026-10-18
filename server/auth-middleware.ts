import { fetchLiveSettings } from './settings-store.ts'
import { createCustomRequest } from './custom-request-store.ts'
import { handleAdminApi } from './admin-api-handler.ts'
import { readProducts } from './product-store.ts'
import { readBanners } from './marketing-store.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHmac } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Plugin } from 'vite'
import {
  addAddress,
  createCustomer,
  findByEmail,
  findById,
  findByResetToken,
  findByVerifyToken,
  issueResetToken,
  issueVerifyToken,
  publicCustomer,
  removeAddress,
  saveCustomer,
  setPassword,
  updateProfile,
  updateAddress,
  type Address,
} from './auth-store.ts'
import {
  attachRazorpayOrder,
  cartFingerprint,
  createOrderFromCart,
  findReusableCheckoutOrder,
  getOrderByNumberForCustomer,
  getOrderForCustomer,
  listOrdersForCustomer,
  markCashOnDelivery,
  markOrderPaid,
  markOrderPaymentFailed,
  type OrderContact,
} from './order-store.ts'
import { createRazorpayOrder, razorpayConfigFrom, verifyRazorpaySignature } from './razorpay.ts'

const COOKIE = 'ck_session'
const SECRET = process.env.COUCHKRAFT_AUTH_SECRET || createHmac('sha256', 'couchkraft-local').update('dev').digest('hex')

type Body = Record<string, unknown>

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<Body> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Body
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (!chunks.length) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as Body
}

function text(body: Body, key: string) {
  return typeof body[key] === 'string' ? body[key] : ''
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
  return true
}

function parseCookies(header?: string) {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key) out[key] = decodeURIComponent(rest.join('='))
  }
  return out
}

function cookieFlags() {
  return process.env.VERCEL ? 'HttpOnly; Path=/; SameSite=Lax; Secure' : 'HttpOnly; Path=/; SameSite=Lax'
}

function setSession(res: ServerResponse, customerId: string) {
  const token = jwt.sign({ sub: customerId }, SECRET, { expiresIn: '7d' })
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; ${cookieFlags()}; Max-Age=${60 * 60 * 24 * 7}`,
  )
}

function clearSession(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieFlags()}; Max-Age=0`)
}

function currentUser(req: IncomingMessage) {
  const token = parseCookies(req.headers.cookie)[COOKIE]
  if (!token) return null
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string }
    return findById(payload.sub)
  } catch {
    return null
  }
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function passwordOk(value: string) {
  return value.length >= 8
}

function phoneOk(value: string) {
  if (!value) return true
  return /^[0-9+\-\s]{8,16}$/.test(value)
}

function parseAddress(body: Body): Omit<Address, 'id'> | { error: string } {
  const label = text(body, 'label').trim() || 'Home'
  const line1 = text(body, 'line1').trim()
  const city = text(body, 'city').trim()
  const region = text(body, 'region').trim()
  const postalCode = text(body, 'postalCode').trim()
  const country = text(body, 'country').trim() || 'India'
  if (!line1 || !city || !region || !postalCode) {
    return { error: 'Address, city, region and postal code are required.' }
  }
  return { label, line1, line2: text(body, 'line2').trim(), city, region, postalCode, country }
}

function originFrom(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-proto']
  const proto = (typeof forwarded === 'string' ? forwarded.split(',')[0] : 'http').trim() || 'http'
  const host = req.headers.host || 'localhost:5173'
  return `${proto}://${host}`
}

const checkoutLocks = new Set<string>()

function parseCartItems(body: Body) {
  const rawItems = Array.isArray(body.items) ? body.items : []
  return rawItems.flatMap((line) => {
    if (!line || typeof line !== 'object') return []
    const row = line as { productId?: string; quantity?: number; finish?: string; customization?: any }
    if (!row.productId) return []
    return [{
      productId: row.productId,
      quantity: Number(row.quantity) || 0,
      finish: row.finish,
      customization: row.customization || undefined,
    }]
  })
}

function requestApiPath(req: IncomingMessage & { query?: Record<string, unknown> }) {
  const forwarded = req.headers['x-forwarded-uri']
  if (typeof forwarded === 'string' && forwarded.includes('/api/')) {
    return forwarded.split('?')[0]
  }
  const fromQuery = req.query?.__ck
  if (typeof fromQuery === 'string' && fromQuery.startsWith('/api')) return fromQuery.split('?')[0]
  const search = req.url?.includes('?') ? new URL(req.url, 'http://localhost').searchParams.get('__ck') : null
  if (search?.startsWith('/api')) return search.split('?')[0]
  return req.url?.split('?')[0] ?? ''
}

export async function handleCouchkraftApi(
  req: IncomingMessage,
  res: ServerResponse,
  runtimeEnv: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const raw = requestApiPath(req)
  const url = raw.startsWith('/api/') || raw === '/api' ? raw : `/api${raw.startsWith('/') ? raw : `/${raw}`}`
  if (
    !url.startsWith('/api/auth') &&
    !url.startsWith('/api/orders') &&
    !url.startsWith('/api/addresses') &&
    !url.startsWith('/api/checkout') &&
    !url.startsWith('/api/admin') &&
    !url.startsWith('/api/products') &&
    !url.startsWith('/api/banners') &&
    !url.startsWith('/api/settings') &&
    !url.startsWith('/api/custom-requests')
  ) {
    return false
  }

  try {
          if (req.method === 'GET' && url === '/api/settings/public') {
            const settings = await fetchLiveSettings()
            return send(res, 200, {
              whatsapp: {
                businessPhone: settings.whatsapp?.businessPhone || '',
                businessName: settings.whatsapp?.businessName || 'CouchKraft Bespoke Concierge',
                enabled: settings.whatsapp?.enabled ?? true,
                leadTimeWeeks: settings.whatsapp?.defaultLeadTimeWeeks || 4,
              },
            })
          }

          if (req.method === 'POST' && url === '/api/custom-requests') {
            const body = await readBody(req)
            const customerName = text(body, 'customerName').trim() || text(body, 'name').trim()
            const customerPhone = text(body, 'customerPhone').trim() || text(body, 'phone').trim()
            if (!customerPhone) {
              return send(res, 400, { error: 'Please enter your phone number so our atelier can follow up.' })
            }
            const user = currentUser(req)
            const created = await createCustomRequest({
              customerId: user ? user.id : null,
              customerName: customerName || (user ? user.name : 'Bespoke Client'),
              customerEmail: text(body, 'customerEmail').trim() || text(body, 'email').trim() || (user ? user.email : ''),
              customerPhone,
              productId: text(body, 'productId'),
              productName: text(body, 'productName'),
              productUrl: text(body, 'productUrl'),
              seatingCapacity: text(body, 'seatingCapacity'),
              dimensions: typeof body.dimensions === 'object' ? (body.dimensions as any) : undefined,
              material: text(body, 'material'),
              fabric: text(body, 'fabric'),
              color: text(body, 'color'),
              budget: text(body, 'budget'),
              notes: text(body, 'notes'),
            })
            return send(res, 201, { ok: true, request: created, message: 'Your bespoke furniture commission has been safely submitted.' })
          }

          if (url.startsWith('/api/admin')) {
            const body = req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : {}
            return handleAdminApi(req, res, url, body)
          }

          if (req.method === 'GET' && url === '/api/products') {
            return send(res, 200, { products: readProducts() })
          }

          if (req.method === 'GET' && url === '/api/banners') {
            return send(res, 200, { banners: readBanners() })
          }

          if (req.method === 'GET' && url === '/api/auth/me') {
            const user = currentUser(req)
            return send(res, 200, { user: user ? publicCustomer(user) : null })
          }

          if (req.method === 'PUT' && url === '/api/auth/profile') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const body = await readBody(req)
            const name = text(body, 'name').trim()
            const email = text(body, 'email').trim()
            const phone = text(body, 'phone').trim()
            if (name.length < 2) return send(res, 400, { error: 'Please enter your full name.' })
            if (!emailOk(email)) return send(res, 400, { error: 'Enter a valid email address.' })
            if (!phoneOk(phone)) return send(res, 400, { error: 'Enter a valid phone number, or leave it blank.' })
            const updated = updateProfile(user, { name, email, phone })
            if ('error' in updated) return send(res, 409, { error: 'An account with this email already exists.' })
            return send(res, 200, { user: publicCustomer(updated.customer) })
          }

          if (req.method === 'POST' && url === '/api/auth/register') {
            const body = await readBody(req)
            const name = text(body, 'name').trim()
            const email = text(body, 'email').trim()
            const phone = text(body, 'phone').trim()
            const password = text(body, 'password')
            const confirm = text(body, 'confirmPassword')
            if (name.length < 2) return send(res, 400, { error: 'Please enter your full name.' })
            if (!emailOk(email)) return send(res, 400, { error: 'Enter a valid email address.' })
            if (!phoneOk(phone)) return send(res, 400, { error: 'Enter a valid phone number, or leave it blank.' })
            if (!passwordOk(password)) return send(res, 400, { error: 'Password must be at least 8 characters.' })
            if (password !== confirm) return send(res, 400, { error: 'Passwords do not match.' })
            const created = await createCustomer({ name, email, phone, password })
            if ('error' in created) return send(res, 409, { error: 'An account with this email already exists.' })
            return send(res, 201, {
              message: 'Account created. Please verify your email before signing in.',
              devActionUrl: `${originFrom(req)}/account/verify?token=${created.verifyToken}`,
            })
          }

          if (req.method === 'POST' && url === '/api/auth/login') {
            const body = await readBody(req)
            const email = text(body, 'email').trim()
            const password = text(body, 'password')
            if (!emailOk(email) || !password) return send(res, 400, { error: 'Enter your email and password.' })
            const customer = findByEmail(email)
            const hash = customer?.passwordHash || '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
            const ok = await bcrypt.compare(password, hash)
            if (!customer || !ok) return send(res, 401, { error: 'Email or password is incorrect.' })
            if (!customer.emailVerified) {
              return send(res, 403, {
                error: 'Please verify your email before signing in.',
                needsVerification: true,
              })
            }
            setSession(res, customer.id)
            return send(res, 200, { user: publicCustomer(customer) })
          }

          if (req.method === 'POST' && url === '/api/auth/logout') {
            clearSession(res)
            return send(res, 200, { ok: true })
          }

          if (req.method === 'POST' && url === '/api/auth/forgot') {
            const body = await readBody(req)
            const email = text(body, 'email').trim()
            if (!emailOk(email)) return send(res, 400, { error: 'Enter a valid email address.' })
            const customer = findByEmail(email)
            const payload: { message: string; devActionUrl?: string } = {
              message: 'If an account exists for this email, reset instructions have been sent.',
            }
            if (customer && customer.emailVerified) {
              payload.devActionUrl = `${originFrom(req)}/account/reset?token=${issueResetToken(customer)}`
            }
            return send(res, 200, payload)
          }

          if (req.method === 'POST' && url === '/api/auth/resend-verification') {
            const body = await readBody(req)
            const email = text(body, 'email').trim()
            if (!emailOk(email)) return send(res, 400, { error: 'Enter a valid email address.' })
            const customer = findByEmail(email)
            const payload: { message: string; devActionUrl?: string } = {
              message: 'If this email needs verification, a new link has been issued.',
            }
            if (customer && !customer.emailVerified) {
              payload.devActionUrl = `${originFrom(req)}/account/verify?token=${issueVerifyToken(customer)}`
            }
            return send(res, 200, payload)
          }

          if (req.method === 'POST' && url === '/api/auth/verify-otp') {
            const body = await readBody(req)
            const email = text(body, 'email').trim()
            const otp = text(body, 'otp').trim()

            if (!email || !otp) {
              return send(res, 400, { error: 'Please enter your email and verification code.' })
            }

            const isDev = process.env.NODE_ENV !== 'production'

            if (!isDev) {
              return send(res, 400, { error: 'Fixed demo OTP is disabled in production. Please use real verification.' })
            }

            if (otp !== '1234') {
              return send(res, 400, { error: 'Invalid verification code. (In development demo mode, use demo OTP: 1234)' })
            }

            const customer = findByEmail(email)
            if (!customer) {
              return send(res, 404, { error: 'No account found for this email address.' })
            }

            customer.emailVerified = true
            customer.verifyTokenHash = null
            customer.verifyExpires = null
            saveCustomer(customer)

            setSession(res, customer.id)
            return send(res, 200, {
              ok: true,
              message: 'Email successfully verified using Demo OTP (1234).',
              user: publicCustomer(customer),
            })
          }

          if (req.method === 'POST' && url === '/api/auth/verify') {
            const body = await readBody(req)
            const token = text(body, 'token')
            const customer = findByVerifyToken(token)
            if (!customer || !customer.verifyExpires || customer.verifyExpires < Date.now()) {
              return send(res, 400, { error: 'This verification link is invalid or has expired.' })
            }
            saveCustomer({
              ...customer,
              emailVerified: true,
              verifyTokenHash: null,
              verifyExpires: null,
            })
            return send(res, 200, { message: 'Email verified. You can sign in now.' })
          }

          if (req.method === 'GET' && url === '/api/addresses') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            return send(res, 200, { addresses: user.addresses })
          }

          if (req.method === 'POST' && url === '/api/addresses') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const parsed = parseAddress(await readBody(req))
            if ('error' in parsed) return send(res, 400, { error: parsed.error })
            return send(res, 201, { address: addAddress(user, parsed) })
          }

          const addressMatch = url.match(/^\/api\/addresses\/([^/]+)$/)
          if (addressMatch && req.method === 'PUT') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const parsed = parseAddress(await readBody(req))
            if ('error' in parsed) return send(res, 400, { error: parsed.error })
            const address = updateAddress(user, addressMatch[1], parsed)
            if (!address) return send(res, 404, { error: 'Address not found.' })
            return send(res, 200, { address })
          }
          if (addressMatch && req.method === 'DELETE') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            if (!removeAddress(user, addressMatch[1])) return send(res, 404, { error: 'Address not found.' })
            return send(res, 200, { ok: true })
          }

          if (req.method === 'GET' && url === '/api/orders') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            return send(res, 200, { orders: listOrdersForCustomer(user.id) })
          }

          if (req.method === 'GET' && url === '/api/checkout/config') {
            const keys = razorpayConfigFrom(runtimeEnv)
            return send(res, 200, {
              configured: true,
              gateway: keys.ok ? 'razorpay' : 'demo',
              mode: keys.ok ? 'test' : 'demo',
              keyId: keys.ok ? keys.config.keyId : null,
              error: null,
            })
          }

          if (req.method === 'POST' && url === '/api/checkout/session') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in to continue to payment.' })
            const keys = razorpayConfigFrom(runtimeEnv)
            if (checkoutLocks.has(user.id)) {
              return send(res, 409, { error: 'A payment attempt is already in progress. Please wait a moment.' })
            }
            checkoutLocks.add(user.id)
            try {
              const body = await readBody(req)
              const addressId = text(body, 'addressId')
              const ownedAddress = addressId ? (user.addresses.find((entry) => entry.id === addressId) ?? null) : null
              if (addressId && !ownedAddress) return send(res, 400, { error: 'Choose a saved address that belongs to you.' })
              let address = ownedAddress
              if (!address) {
                const parsedAddress = parseAddress(body)
                if ('error' in parsedAddress) return send(res, 400, { error: parsedAddress.error })
                address = { ...parsedAddress, id: 'checkout' }
              }
              const items = parseCartItems(body)
              const coupon = text(body, 'coupon') || null
              const phone = text(body, 'phone').trim() || user.phone
              if (!phoneOk(phone) || !phone) return send(res, 400, { error: 'Enter a valid phone number for this order.' })
              const contact: OrderContact = {
                name: text(body, 'name').trim() || user.name,
                email: user.email,
                phone,
              }
              const fingerprint = cartFingerprint(items, coupon, `${address.line1}|${address.city}|${address.postalCode}`)
              let order = findReusableCheckoutOrder(user.id, fingerprint)
              if (!order) {
                const created = await createOrderFromCart(user.id, {
                  items,
                  address,
                  coupon,
                  contact,
                  paymentStatus: 'pending',
                  cartFingerprint: fingerprint,
                })
                if ('error' in created) return send(res, 400, { error: (created as any).message || 'Your bag has no valid pieces to order.' })
                order = created.order
              }
              if (order.paymentStatus === 'paid') {
                return send(res, 200, { order, alreadyPaid: true, gateway: keys.ok ? 'razorpay' : 'demo' })
              }
              if (!order.razorpayOrderId) {
                if (keys.ok) {
                  const razorpayOrder = await createRazorpayOrder(keys.config, {
                    amountPaise: order.amountPaise,
                    receipt: order.number,
                    notes: { couchkraftOrderId: order.id, customerId: user.id },
                  })
                  order = attachRazorpayOrder(order.id, user.id, razorpayOrder.id) || order
                } else {
                  order = attachRazorpayOrder(order.id, user.id, `order_demo_${order.id}`) || order
                }
              }
              return send(res, 200, {
                gateway: keys.ok ? 'razorpay' : 'demo',
                keyId: keys.ok ? keys.config.keyId : null,
                razorpayOrderId: order.razorpayOrderId,
                amount: order.amountPaise,
                currency: 'INR',
                order,
              })
            } catch (error) {
              return send(res, 502, {
                error: error instanceof Error ? error.message : 'Payment could not be started. Please retry.',
              })
            } finally {
              checkoutLocks.delete(user.id)
            }
          }

          if (req.method === 'POST' && url === '/api/checkout/demo') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            if (razorpayConfigFrom(runtimeEnv).ok) {
              return send(res, 400, { error: 'Demo gateway is disabled while Razorpay test keys are configured.' })
            }
            const body = await readBody(req)
            const orderId = text(body, 'orderId')
            const method = text(body, 'method')
            const action = text(body, 'action') || 'success'
            const methods = ['card', 'cash', 'upi', 'netbanking'] as const
            if (!methods.includes(method as (typeof methods)[number])) {
              return send(res, 400, { error: 'Choose card, cash, UPI or net banking.' })
            }
            const existing = getOrderForCustomer(user.id, orderId)
            if (!existing) return send(res, 404, { error: 'Order not found.' })
            if (!existing.razorpayOrderId?.startsWith('order_demo_')) {
              return send(res, 400, { error: 'This order is not using the demo gateway.' })
            }
            if (action === 'fail') {
              const order = markOrderPaymentFailed(orderId, user.id, 'Demo payment failed.')
              return send(res, 200, { order, failed: true })
            }
            const labels: Record<string, string> = {
              card: 'Card',
              upi: 'UPI',
              netbanking: 'Net banking',
              cash: 'Cash on delivery',
            }
            if (method === 'cash') {
              const result = await markCashOnDelivery(user.id, {
                orderId,
                razorpayOrderId: existing.razorpayOrderId,
              })
              if ('error' in result) return send(res, 400, { error: 'This payment does not match the order on your account.' })
              return send(res, 200, { order: result.order })
            }
            const result = await markOrderPaid(user.id, {
              orderId,
              razorpayOrderId: existing.razorpayOrderId,
              razorpayPaymentId: `pay_demo_${existing.id}`,
              paymentMethod: method,
              deliveryMethod: labels[method],
            })
            if ('error' in result) return send(res, 400, { error: 'This payment does not match the order on your account.' })
            return send(res, 200, { order: result.order })
          }

          if (req.method === 'POST' && url === '/api/checkout/verify') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const keys = razorpayConfigFrom(runtimeEnv)
            if (!keys.ok) return send(res, 400, { error: 'Use the demo gateway until Razorpay test keys are added.' })
            const body = await readBody(req)
            const orderId = text(body, 'orderId')
            const razorpayOrderId = text(body, 'razorpay_order_id')
            const razorpayPaymentId = text(body, 'razorpay_payment_id')
            const signature = text(body, 'razorpay_signature')
            if (!orderId || !razorpayOrderId || !razorpayPaymentId || !signature) {
              return send(res, 400, { error: 'Payment details are incomplete.' })
            }
            const valid = verifyRazorpaySignature(keys.config.keySecret, {
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              signature,
            })
            if (!valid) {
              markOrderPaymentFailed(orderId, user.id, 'Payment signature could not be verified.')
              return send(res, 400, { error: 'Payment could not be verified. This order has not been marked as paid.' })
            }
            const result = await markOrderPaid(user.id, { orderId, razorpayOrderId, razorpayPaymentId })
            if ('error' in result) {
              return send(res, result.error === 'missing' ? 404 : 400, {
                error:
                  result.error === 'missing'
                    ? 'Order not found.'
                    : 'This payment does not match the order on your account.',
              })
            }
            return send(res, 200, { order: result.order })
          }

          if (req.method === 'POST' && url === '/api/checkout/fail') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const body = await readBody(req)
            const order = markOrderPaymentFailed(
              text(body, 'orderId'),
              user.id,
              text(body, 'reason') || 'Payment failed or was cancelled.',
            )
            if (!order) return send(res, 404, { error: 'Order not found.' })
            return send(res, 200, { order })
          }

          if (req.method === 'POST' && url === '/api/orders') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const body = await readBody(req)
            const addressId = text(body, 'addressId')
            const address = addressId ? (user.addresses.find((entry) => entry.id === addressId) ?? null) : null
            if (addressId && !address) return send(res, 400, { error: 'Choose a saved address that belongs to you.' })
            const items = parseCartItems(body)
            const created = await createOrderFromCart(user.id, {
              items,
              address,
              coupon: text(body, 'coupon') || null,
            })
            if ('error' in created) return send(res, 400, { error: (created as any).message || 'Your bag has no valid pieces to order.' })
            return send(res, 201, { order: created.order })
          }

          if (req.method === 'GET' && url === '/api/orders/lookup') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const number = new URL(req.url || '', 'http://localhost').searchParams.get('number') || ''
            const order = getOrderByNumberForCustomer(user.id, number)
            if (!order) return send(res, 404, { error: 'No matching order was found on this account.' })
            return send(res, 200, { order })
          }

          const orderMatch = url.match(/^\/api\/orders\/([^/]+)$/)
          if (orderMatch && req.method === 'GET') {
            const user = currentUser(req)
            if (!user) return send(res, 401, { error: 'Please sign in.' })
            const order = getOrderForCustomer(user.id, orderMatch[1])
            if (!order) return send(res, 404, { error: 'Order not found.' })
            return send(res, 200, { order })
          }

          if (req.method === 'POST' && url === '/api/auth/reset') {
            const body = await readBody(req)
            const token = text(body, 'token')
            const password = text(body, 'password')
            const confirm = text(body, 'confirmPassword')
            if (!passwordOk(password)) return send(res, 400, { error: 'Password must be at least 8 characters.' })
            if (password !== confirm) return send(res, 400, { error: 'Passwords do not match.' })
            const customer = findByResetToken(token)
            if (!customer || !customer.resetExpires || customer.resetExpires < Date.now()) {
              return send(res, 400, { error: 'This reset link is invalid or has expired.' })
            }
            await setPassword(customer, password)
            return send(res, 200, { message: 'Password updated. You can sign in now.' })
          }

          return send(res, 404, { error: 'Not found.' })
  } catch {
    return send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}

export function authApiPlugin(env: Record<string, string> = {}): Plugin {
  const runtimeEnv = { ...process.env, ...env } as Record<string, string | undefined>

  return {
    name: 'couchkraft-auth-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleCouchkraftApi(req, res, runtimeEnv)
        if (!handled) next()
      })
    },
  }
}
