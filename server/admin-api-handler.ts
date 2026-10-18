import { readSettings, writeSettings } from './settings-store.ts'
import { readCustomRequests, updateCustomRequestStatus } from './custom-request-store.ts'
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
  deleteProduct,
  readCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './product-store.ts'
import {
  readCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  readBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from './marketing-store.ts'
import { dataDirectory } from './data-path.ts'
import type { Order } from './order-store.ts'
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

function readAllOrders(): Order[] {
  try {
    const p = resolve(dataDirectory(), 'orders.json')
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as Order[]
    }
  } catch {}
  return []
}

function writeAllOrders(orders: Order[]) {
  const p = resolve(dataDirectory(), 'orders.json')
  writeFileSync(p, JSON.stringify(orders, null, 2), 'utf8')
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
    const orders = readAllOrders()
    const customers = readAllCustomers()
    const products = await readProducts()

    const todayStr = new Date().toISOString().split('T')[0]
    const todayOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(todayStr))
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0)

    const thisMonthStr = todayStr.slice(0, 7)
    const monthOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(thisMonthStr))
    const monthSales = monthOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0)
    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0)

    const pendingOrders = orders.filter((o) => o.fulfilmentStatus !== 'delivered').length
    const deliveredOrders = orders.filter((o) => o.fulfilmentStatus === 'delivered').length
    const lowStockProducts = products.filter((p) => p.readyToShipStock <= p.lowStockThreshold)

    return send(res, 200, {
      todaySales,
      todayOrdersCount: todayOrders.length,
      monthlySales: monthSales,
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      customerCount: customers.length,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      pendingEnquiriesCount: 3, // Customization inquiries telemetry
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
    const orders = readAllOrders()
    return send(res, 200, { orders })
  }

  const orderStatusMatch = url.match(/^\/api\/admin\/orders\/([^/]+)\/status$/)
  if (orderStatusMatch && req.method === 'PUT') {
    const orderId = orderStatusMatch[1]
    const orders = readAllOrders()
    const idx = orders.findIndex((o) => o.id === orderId || o.number === orderId)
    if (idx === -1) return send(res, 404, { error: 'Order not found.' })

    const fulfilmentStatus = String(body.fulfilmentStatus || orders[idx].fulfilmentStatus)
    const paymentStatus = String(body.paymentStatus || orders[idx].paymentStatus)
    const trackingNumber = body.trackingNumber !== undefined ? String(body.trackingNumber) : orders[idx].trackingNumber

    orders[idx] = {
      ...orders[idx],
      fulfilmentStatus: fulfilmentStatus as any,
      paymentStatus: paymentStatus as any,
      trackingNumber,
    }
    writeAllOrders(orders)

    logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      action: 'update_order_status',
      targetType: 'order',
      targetId: orders[idx].id,
      details: { orderNumber: orders[idx].number, fulfilmentStatus, paymentStatus },
    })

    return send(res, 200, { order: orders[idx], message: 'Order status updated.' })
  }

  // 10. CUSTOMERS MANAGEMENT
  if (req.method === 'GET' && url === '/api/admin/customers') {
    const customers = readAllCustomers()
    const orders = readAllOrders()
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

  // 11. IMAGE UPLOAD
  if (req.method === 'POST' && url === '/api/admin/upload') {
    const dataUri = String(body.dataUri || '')
    const fileName = String(body.fileName || `asset_${Date.now()}.png`).replace(/[^a-zA-Z0-9_.-]/g, '_')
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

    const publicUploads = resolve(process.cwd(), 'public', 'uploads')
    if (!existsSync(publicUploads)) mkdirSync(publicUploads, { recursive: true })

    const finalName = `upload_${Date.now()}_${fileName}`
    writeFileSync(resolve(publicUploads, finalName), buffer)

    return send(res, 200, {
      url: `/uploads/${finalName}`,
      size: buffer.length,
      name: finalName,
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
    return send(res, 200, { requests: readCustomRequests() })
  }

  const reqMatch = url.match(/^\/api\/admin\/custom-requests\/([^/]+)$/)
  if (reqMatch) {
    const reqId = reqMatch[1]
    if (req.method === 'PUT') {
      const updated = await updateCustomRequestStatus(reqId, {
        status: body.status as any,
        adminNotes: typeof body.adminNotes === 'string' ? body.adminNotes : undefined,
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
