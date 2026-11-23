import { readSettings, writeSettings } from './settings-store.ts'
import { listAllCustomRequests, updateCustomRequestStatus } from './custom-request-store.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import {
  findAdminByEmail,
  publicAdmin,
  signAdminToken,
  verifyAdminToken,
  logAdminAction,
  getAuditLogs,
} from './admin-store.ts'
import {
  readProducts,
  findProductById,
  createProduct,
  updateProduct,
  setFestiveDiscountForProducts,
  deleteProduct,
  readCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './product-store.ts'
import {
  readCoupons,
  createCoupon,
  createPersonalCoupon,
  updateCoupon,
  deleteCoupon,
  readBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from './marketing-store.ts'
import { dataDirectory } from './data-path.ts'
import { listAllOrders, nextTrackingNumber, normaliseOrder as normaliseOrderRow } from './order-store.ts'
import { supabase } from './supabase-client.ts'

const IST = 'Asia/Kolkata'

function calendarDayInZone(iso: string, timeZone = IST) {
  const stamp = new Date(iso)
  if (Number.isNaN(stamp.getTime())) return ''
  return stamp.toLocaleDateString('en-CA', { timeZone })
}

function paidOrderTotal(order: { paymentStatus: string; total: number }) {
  return order.paymentStatus === 'paid' ? order.total : 0
}
import type { Customer } from './auth-store.ts'

const ADMIN_COOKIE = 'ck_admin_session'

type Body = Record<string, unknown>

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
  return true
}

function parseCookies(header?: string): Record<string, string> {
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

function setAdminSession(res: ServerResponse, token: string) {
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${token}; ${cookieFlags()}; Max-Age=${60 * 60 * 24 * 7}`)
}

function clearAdminSession(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; ${cookieFlags()}; Max-Age=0`)
}

export function currentAdmin(req: IncomingMessage) {
  // Check Authorization header first
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const admin = verifyAdminToken(token)
    if (admin) return admin
  }

  // Check cookie
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ADMIN_COOKIE]
  if (token) {
    return verifyAdminToken(token)
  }

  return null
}

function readAllCustomers(): Customer[] {
  try {
    const p = resolve(dataDirectory(), 'customers.json')
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as Customer[]
    }
  } catch {}
  return []
}

export async function handleAdminApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  body: Body,
): Promise<boolean> {
  // 1. PUBLIC ADMIN AUTH ROUTES
  if (req.method === 'POST' && url === '/api/admin/auth/login') {
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    if (!email || !password) {
      return send(res, 400, { error: 'Please enter administrator email and password.' })
    }

    const admin = findAdminByEmail(email)
    if (!admin) {
      return send(res, 401, { error: 'Invalid administrator credentials.' })
    }

    const matches = await bcrypt.compare(password, admin.passwordHash)
    if (!matches) {
      return send(res, 401, { error: 'Invalid administrator credentials.' })
    }

    const token = signAdminToken(admin)
    setAdminSession(res, token)
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'login',
      targetType: 'admin_session',
      targetId: admin.id,
    })

    return send(res, 200, {
      admin: publicAdmin(admin),
      token,
      message: 'Welcome back, ' + admin.name,
    })
  }

  if (req.method === 'POST' && url === '/api/admin/auth/logout') {
    clearAdminSession(res)
    return send(res, 200, { ok: true, message: 'Signed out successfully.' })
  }

  // 2. CHECK AUTHORIZATION FOR ALL SUBSEQUENT ADMIN ROUTES
  const admin = currentAdmin(req)
  if (!admin) {
    return send(res, 401, { error: 'Unauthorized. Admin session required.' })
  }

  if (req.method === 'GET' && url === '/api/admin/auth/me') {
    return send(res, 200, { admin: publicAdmin(admin) })
  }

  // 3. DASHBOARD METRICS & TELEMETRY
  if (req.method === 'GET' && url === '/api/admin/dashboard/stats') {
    const orders = await listAllOrders()
    const products = await readProducts()
    const customRequests = await listAllCustomRequests()

    const todayIst = calendarDayInZone(new Date().toISOString())
    const monthIst = todayIst.slice(0, 7)

    const todayOrders = orders.filter((o) => o.createdAt && calendarDayInZone(o.createdAt) === todayIst)
    const monthOrders = orders.filter((o) => {
      const day = calendarDayInZone(o.createdAt)
      return day && day.startsWith(monthIst)
    })

    const todaySales = todayOrders.reduce((sum, o) => sum + paidOrderTotal(o), 0)
    const monthlySales = monthOrders.reduce((sum, o) => sum + paidOrderTotal(o), 0)
    const totalRevenue = orders.reduce((sum, o) => sum + paidOrderTotal(o), 0)

    const pendingOrders = orders.filter((o) => o.fulfilmentStatus !== 'delivered').length
    const deliveredOrders = orders.filter((o) => o.fulfilmentStatus === 'delivered').length
    const lowStockProducts = products.filter(
      (p) => !p.madeToOrder && p.status !== 'archived' && p.readyToShipStock <= p.lowStockThreshold,
    )

    const { data: customerRows, error: customerCountError } = await supabase.from('customers').select('id')
    if (customerCountError) {
      console.warn('[AdminDashboard] customer count error:', customerCountError.message)
    }
    const customersFromOrders = new Set(orders.map((o) => o.customerId).filter(Boolean)).size
    const customerCount = Math.max(customerRows?.length ?? 0, customersFromOrders, readAllCustomers().length)

    const pendingEnquiriesCount = customRequests.filter((r) => r.status === 'new' || r.status === 'under_review').length
    const approvedAwaitingPayment = customRequests.filter(
      (r) =>
        r.status === 'approved' &&
        r.paymentStatus !== 'paid' &&
        Number(r.quoteAmount) > 0,
    )
    const recentApprovedCommissions = customRequests
      .filter((r) => r.status === 'approved')
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        productName: r.productName,
        customerName: r.customerName,
        quoteAmount: r.quoteAmount,
        paymentStatus: r.paymentStatus || 'none',
        updatedAt: r.updatedAt,
      }))

    return send(res, 200, {
      todaySales,
      todayOrdersCount: todayOrders.length,
      monthlySales,
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      customerCount,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      pendingEnquiriesCount,
      approvedAwaitingPaymentCount: approvedAwaitingPayment.length,
      recentApprovedCommissions,
      recentOrders: orders.slice(0, 6),
      recentAudit: getAuditLogs(5),
    })
  }

  // 4. PRODUCT MANAGEMENT
  if (req.method === 'GET' && url === '/api/admin/products') {
    try {
      const products = await readProducts()
      return send(res, 200, { products })
    } catch (err: any) {
      return send(res, 500, { error: err.message || 'Failed to fetch products from Supabase.' })
    }
  }

  if (req.method === 'POST' && url === '/api/admin/products/festive-discount') {
    try {
      const action = String(body.action || 'apply')
      const scope = body.scope === 'all' ? 'all' : 'one'
      const productId = typeof body.productId === 'string' ? body.productId : undefined
      if (action === 'remove') {
        const result = await setFestiveDiscountForProducts({ percent: null, scope, productId })
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: 'remove_festive_discount',
          targetType: 'product',
          targetId: scope === 'all' ? 'all' : productId || '',
          details: { scope, updatedCount: result.updatedCount },
        })
        return send(res, 200, {
          ok: true,
          message: scope === 'all' ? 'Festive discount removed from all products.' : 'Festive discount removed for this product.',
          updatedCount: result.updatedCount,
        })
      }
      const percent = Number(body.percent)
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        return send(res, 400, { error: 'Enter a discount between 1 and 100 percent.' })
      }
      const discountType = body.discountType === 'standard' ? 'standard' : 'festive'
      const result = await setFestiveDiscountForProducts({ percent, scope, productId, discountType })
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: 'apply_festive_discount',
        targetType: 'product',
        targetId: scope === 'all' ? 'all' : productId || '',
        details: { scope, percent, updatedCount: result.updatedCount },
      })
      return send(res, 200, {
        ok: true,
        message:
          scope === 'all'
            ? `Festive ${percent}% discount applied to ${result.updatedCount} products.`
            : `Festive ${percent}% discount applied to this product.`,
        updatedCount: result.updatedCount,
        percent,
      })
    } catch (err: any) {
      return send(res, 500, { error: err.message || 'Could not update festive discount.' })
    }
  }

  if (req.method === 'POST' && url === '/api/admin/products') {
    try {
      const created = await createProduct(body)
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: 'create_product',
        targetType: 'product',
        targetId: created.id,
        details: { name: created.name, sku: created.sku, price: created.price },
      })
      return send(res, 201, { product: created, message: 'Product created and published to Supabase successfully.' })
    } catch (err: any) {
      return send(res, 400, { error: err.message || 'Failed to create product in Supabase.' })
    }
  }

  const productMatch = url.match(/^\/api\/admin\/products\/([^/]+)$/)
  if (productMatch) {
    const prodId = productMatch[1]
    if (req.method === 'GET') {
      const prod = await findProductById(prodId)
      if (!prod) return send(res, 404, { error: 'Product not found.' })
      return send(res, 200, { product: prod })
    }

    if (req.method === 'PUT') {
      try {
        const updated = await updateProduct(prodId, body)
        if (!updated) return send(res, 404, { error: 'Product not found.' })
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: 'update_product',
          targetType: 'product',
          targetId: updated.id,
          details: { name: updated.name, price: updated.price, status: updated.status },
        })
        return send(res, 200, { product: updated, message: 'Product updated in Supabase successfully.' })
      } catch (err: any) {
        return send(res, 400, { error: err.message || 'Failed to update product in Supabase.' })
      }
    }

    if (req.method === 'DELETE') {
      try {
        const deleted = await deleteProduct(prodId)
        if (!deleted) return send(res, 404, { error: 'Product not found.' })
        logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          action: 'delete_product',
          targetType: 'product',
          targetId: prodId,
        })
        return send(res, 200, { ok: true, message: 'Product removed from catalog.' })
      } catch (err: any) {
        return send(res, 400, { error: err.message || 'Failed to delete product from Supabase.' })
      }
    }
  }

  // 5. CATEGORIES
  if (req.method === 'GET' && url === '/api/admin/categories') {
    try {
      const categories = await readCategories()
      return send(res, 200, { categories })
    } catch (err: any) {
      return send(res, 500, { error: err.message || 'Failed to fetch categories.' })
    }
  }

  if (req.method === 'POST' && url === '/api/admin/categories') {
    try {
      const created = await createCategory(body)
      return send(res, 201, { category: created })
    } catch (err: any) {
      return send(res, 400, { error: err.message || 'Failed to create category.' })
    }
  }

  const catMatch = url.match(/^\/api\/admin\/categories\/([^/]+)$/)
  if (catMatch) {
    const catId = catMatch[1]
    if (req.method === 'PUT') {
      try {
        const updated = await updateCategory(catId, body)
        if (!updated) return send(res, 404, { error: 'Category not found.' })
        return send(res, 200, { category: updated })
      } catch (err: any) {
        return send(res, 400, { error: err.message || 'Failed to update category.' })
      }
    }
    if (req.method === 'DELETE') {
      try {
        const ok = await deleteCategory(catId)
        if (!ok) return send(res, 404, { error: 'Category not found.' })
        return send(res, 200, { ok: true })
      } catch (err: any) {
        return send(res, 400, { error: err.message || 'Failed to delete category.' })
      }
    }
  }

  // 6. INVENTORY
  if (req.method === 'GET' && url === '/api/admin/inventory') {
    const products = await readProducts()
    const inventory = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      readyToShipStock: p.readyToShipStock,
      lowStockThreshold: p.lowStockThreshold,
      madeToOrder: p.madeToOrder,
      leadTimeWeeks: p.leadTimeWeeks,
      status: p.readyToShipStock <= 0 ? 'Out of Stock' : p.readyToShipStock <= p.lowStockThreshold ? 'Low Stock' : 'In Stock',
      image: p.images[0] || '',
      price: p.price,
    }))
    return send(res, 200, { inventory })
  }

  // 7. COUPONS & OFFERS
  if (req.method === 'GET' && url === '/api/admin/coupons') {
    return send(res, 200, { coupons: readCoupons() })
  }

  if (req.method === 'POST' && url === '/api/admin/coupons/personal') {
    const customerId = String(body.customerId || '').trim()
    const customerName = String(body.customerName || body.name || 'Customer').trim()
    const customerEmail = String(body.customerEmail || body.email || '').trim().toLowerCase()
    if (!customerId || !customerEmail) {
      return send(res, 400, { error: 'customerId and customerEmail are required.' })
    }
    const created = createPersonalCoupon({
      customerId,
      customerName,
      customerEmail,
      type: body.type === 'flat' ? 'flat' : 'percent',
      value: Number(body.value) || 12,
      minOrderValue: Number(body.minOrderValue) || 15000,
      description: String(body.description || `Personal offer for ${customerName}`),
      source: 'admin',
    })
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'create_personal_coupon',
      targetType: 'coupon',
      targetId: created.id,
      details: { code: created.code, customerEmail },
    })
    return send(res, 201, { coupon: created, message: 'Personal coupon issued.' })
  }

  if (req.method === 'POST' && url === '/api/admin/coupons') {
    const created = createCoupon(body)
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'create_coupon',
      targetType: 'coupon',
      targetId: created.id,
      details: { code: created.code, value: created.value, type: created.type },
    })
    return send(res, 201, { coupon: created, message: 'Coupon created.' })
  }

  const couponMatch = url.match(/^\/api\/admin\/coupons\/([^/]+)$/)
  if (couponMatch) {
    const coupId = couponMatch[1]
    if (req.method === 'PUT') {
      const updated = updateCoupon(coupId, body)
      if (!updated) return send(res, 404, { error: 'Coupon not found.' })
      return send(res, 200, { coupon: updated, message: 'Coupon updated.' })
    }
    if (req.method === 'DELETE') {
      const ok = deleteCoupon(coupId)
      if (!ok) return send(res, 404, { error: 'Coupon not found.' })
      return send(res, 200, { ok: true, message: 'Coupon deleted.' })
    }
  }

  // 8. PROMOTIONAL BANNERS
  if (req.method === 'GET' && url === '/api/admin/banners') {
    return send(res, 200, { banners: readBanners() })
  }

  if (req.method === 'POST' && url === '/api/admin/banners') {
    const created = createBanner(body)
    return send(res, 201, { banner: created, message: 'Promotional banner added.' })
  }

  const bannerMatch = url.match(/^\/api\/admin\/banners\/([^/]+)$/)
  if (bannerMatch) {
    const bannerId = bannerMatch[1]
    if (req.method === 'PUT') {
      const updated = updateBanner(bannerId, body)
      if (!updated) return send(res, 404, { error: 'Banner not found.' })
      return send(res, 200, { banner: updated, message: 'Banner updated.' })
    }
    if (req.method === 'DELETE') {
      const ok = deleteBanner(bannerId)
      if (!ok) return send(res, 404, { error: 'Banner not found.' })
      return send(res, 200, { ok: true, message: 'Banner removed.' })
    }
  }

  // 9. ORDERS MANAGEMENT
  if (req.method === 'GET' && url === '/api/admin/orders') {
    const orders = await listAllOrders()
    for (const order of orders) {
      if (!order.trackingNumber) {
        const tracking = nextTrackingNumber(order)
        const estimated = order.estimatedDelivery || order.createdAt
        await supabase
          .from('orders')
          .update({ tracking_number: tracking, estimated_delivery: estimated, updated_at: new Date().toISOString() })
          .eq('id', order.id)
        order.trackingNumber = tracking
        order.estimatedDelivery = estimated
      }
    }
    return send(res, 200, { orders })
  }

  const orderStatusMatch = url.match(/^\/api\/admin\/orders\/([^/]+)\/status$/)
  if (orderStatusMatch && req.method === 'PUT') {
    if (admin.role === 'editor') {
      return send(res, 403, { error: 'Your admin role cannot update order status.' })
    }
    const orderId = orderStatusMatch[1]
    const fulfilmentStatus = String(body.fulfilmentStatus || 'placed')
    const allowedFulfilment = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
    if (body.paymentStatus !== undefined) {
      return send(res, 400, { error: 'Payment status can only be changed by verified payment processing.' })
    }
    if (!allowedFulfilment.includes(fulfilmentStatus)) {
      return send(res, 400, { error: 'Invalid fulfilment status.' })
    }
    const { data: existingRow } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
    let existingOrder = existingRow ? normaliseOrderRow(existingRow) : null
    if (!existingOrder) {
      const byNum = await supabase.from('orders').select('*').eq('number', orderId).maybeSingle()
      if (byNum.data) existingOrder = normaliseOrderRow(byNum.data)
    }
    if (!existingOrder) return send(res, 404, { error: 'Order not found.' })
    const existingOrderResolved = existingOrder
    const trackingNumber =
      String(body.trackingNumber || '').trim() ||
      existingOrderResolved.trackingNumber ||
      nextTrackingNumber(existingOrderResolved)
    const estimatedDelivery =
      existingOrderResolved.estimatedDelivery || existingOrderResolved.createdAt
    const patch: Record<string, unknown> = {
      fulfilment_status: fulfilmentStatus,
      tracking_number: trackingNumber,
      estimated_delivery: estimatedDelivery,
      updated_at: new Date().toISOString(),
    }
    const byId = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select('*')
      .maybeSingle()
    let updated = byId.data
    if (byId.error) return send(res, 400, { error: `Could not update order: ${byId.error.message}` })
    if (!updated) {
      const byNumber = await supabase
        .from('orders')
        .update(patch)
        .eq('number', orderId)
        .select('*')
        .maybeSingle()
      if (byNumber.error) return send(res, 400, { error: `Could not update order: ${byNumber.error.message}` })
      updated = byNumber.data
    }
    if (!updated) return send(res, 404, { error: 'Order not found.' })

    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'update_order_status',
      targetType: 'order',
      targetId: updated.id,
      details: { orderNumber: updated.number, fulfilmentStatus, trackingNumber },
    })

    return send(res, 200, { order: normaliseOrderRow(updated), message: 'Order status updated.' })
  }

  // 10. CUSTOMERS MANAGEMENT
  if (req.method === 'GET' && url === '/api/admin/customers') {
    const customers = readAllCustomers()
    const orders = await listAllOrders()
    const safeCustomers = customers.map((c) => {
      const customerOrders = orders.filter((o) => o.customerId === c.id)
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0)
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        emailVerified: c.emailVerified,
        createdAt: c.createdAt,
        addressesCount: c.addresses ? c.addresses.length : 0,
        ordersCount: customerOrders.length,
        totalSpent,
      }
    })
    return send(res, 200, { customers: safeCustomers })
  }

  // 11. IMAGE UPLOAD (service-role Supabase storage; bypasses browser Storage RLS)
  if (req.method === 'POST' && url === '/api/admin/upload') {
    const dataUri = String(body.dataUri || '')
    const fileName = String(body.fileName || `asset_${Date.now()}.png`).replace(/[^a-zA-Z0-9_.-]/g, '_')
    const bucket = String(body.bucket || 'products').replace(/[^a-zA-Z0-9_-]/g, '')
    const objectPath = String(body.objectPath || fileName).replace(/^\/+/, '')
    const upsert = body.upsert === true

    if (!dataUri.startsWith('data:image/')) {
      return send(res, 400, { error: 'Invalid image format. Expected base64 data URI.' })
    }

    const matches = dataUri.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
    if (!matches) {
      return send(res, 400, { error: 'Malformed image data URI.' })
    }

    const buffer = Buffer.from(matches[2], 'base64')
    if (buffer.length > 10 * 1024 * 1024) {
      return send(res, 400, { error: 'Image exceeds 10MB limit.' })
    }

    const contentType = matches[1] === 'jpeg' ? 'image/jpeg' : `image/${matches[1]}`

    const { error: storageError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      upsert,
      cacheControl: '3600',
    })

    if (!storageError) {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath)
      const supabaseUrl = publicData.publicUrl
        || `${String(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`
      return send(res, 200, {
        url: supabaseUrl,
        size: buffer.length,
        name: objectPath,
        bucket,
        source: 'supabase',
      })
    }

    console.warn('[AdminUpload] Supabase storage upload failed:', storageError.message)

    const publicUploads = resolve(process.cwd(), 'public', 'uploads')
    if (!existsSync(publicUploads)) mkdirSync(publicUploads, { recursive: true })

    const finalName = `upload_${Date.now()}_${fileName}`
    writeFileSync(resolve(publicUploads, finalName), buffer)

    return send(res, 200, {
      url: `/uploads/${finalName}`,
      size: buffer.length,
      name: finalName,
      source: 'local',
      warning: storageError.message,
    })
  }

  // 12. AUDIT LOGS
  if (req.method === 'GET' && url === '/api/admin/audit') {
    return send(res, 200, { logs: getAuditLogs(100) })
  }

  
  // 13. STORE SETTINGS (WHATSAPP BUSINESS CONCIERGE)
  if (req.method === 'GET' && url === '/api/admin/settings') {
    return send(res, 200, { settings: readSettings() })
  }

  if (req.method === 'PUT' && url === '/api/admin/settings') {
    const current = readSettings()
    const updated = writeSettings({
      whatsapp: {
        ...current.whatsapp,
        ...((body.whatsapp || body) as any),
      },
    })
    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'update_settings',
      targetType: 'settings',
      targetId: 'whatsapp',
      details: { businessPhone: updated.whatsapp.businessPhone },
    })
    return send(res, 200, { ok: true, settings: updated, message: 'Settings saved successfully.' })
  }

  // 14. CUSTOMIZATION BESPOKE REQUESTS
  if (req.method === 'GET' && url === '/api/admin/custom-requests') {
    return send(res, 200, { requests: await listAllCustomRequests() })
  }

  const reqMatch = url.match(/^\/api\/admin\/custom-requests\/([^/]+)$/)
  if (reqMatch) {
    const reqId = reqMatch[1]
    if (req.method === 'PUT') {
      let quoteAmount: number | null | undefined
      if (body.quoteAmount === null || body.quoteAmount === '') quoteAmount = null
      else if (typeof body.quoteAmount === 'number') quoteAmount = body.quoteAmount
      else if (typeof body.quoteAmount === 'string' && body.quoteAmount.trim()) {
        const n = Number(body.quoteAmount)
        quoteAmount = Number.isFinite(n) ? n : null
      }
      const updated = await updateCustomRequestStatus(reqId, {
        status: body.status as any,
        adminNotes: typeof body.adminNotes === 'string' ? body.adminNotes : undefined,
        quoteAmount,
      })
      if (!updated) return send(res, 404, { error: 'Custom request not found.' })
      logAdminAction({
        adminId: admin.id,
        adminName: admin.name,
        action: 'update_custom_request',
        targetType: 'custom_request',
        targetId: reqId,
        details: { status: updated.status },
      })
      return send(res, 200, { ok: true, request: updated, message: 'Request status updated.' })
    }
  }

  return send(res, 404, { error: 'Admin API route not found.' })
}
