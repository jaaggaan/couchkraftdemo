import { supabase } from './supabase'

const BASE = '/api/admin'

async function backendRequest<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('ck_admin_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...opts, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

function toProductDbRow(p: any): Record<string, any> {
  const slug = (p.slug || p.name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return {
    id: p.id || `ck-${slug}-${Date.now().toString(36)}`,
    slug,
    name: p.name || 'Untitled Product',
    sku: p.sku || `CK-SKU-${Date.now().toString(36).toUpperCase()}`,
    price: Number(p.price) || 0,
    compare_at: Number(p.compareAt ?? p.compare_at) || 0,
    category_id: p.categoryId ?? p.category_id ?? 'cat_sofas',
    category: p.category || 'Living Room > Sofas & Couches',
    sub_category: p.subCategory ?? p.sub_category ?? 'Standard',
    space: p.space || 'living',
    tabs: p.tabs || ['bestsellers'],
    short_excerpt: p.shortExcerpt ?? p.short_excerpt ?? '',
    description: p.description || '',
    images: Array.isArray(p.images) ? p.images : [],
    video_url: p.videoUrl ?? p.video_url ?? '',
    finishes: p.finishes || ['Standard'],
    color_swatches: p.colorSwatches ?? p.color_swatches ?? [],
    care: p.care || '',
    dimensions: p.dimensions || { width: 200, depth: 90, height: 80, seatHeight: 42 },
    net_weight: p.netWeight ?? p.net_weight ?? '50 kg',
    seating_capacity: p.seatingCapacity ?? p.seating_capacity ?? '3 Persons',
    warranty: p.warranty || '5 Years Structural Frame',
    structural_wood: p.structuralWood ?? p.structural_wood ?? 'Kiln-dried Hardwood',
    foam_upholstery: p.foamUpholstery ?? p.foam_upholstery ?? '38-Density Ultra-Cell Foam',
    ready_to_ship_stock: Number(p.readyToShipStock ?? p.ready_to_ship_stock) || 0,
    low_stock_threshold: Number(p.lowStockThreshold ?? p.low_stock_threshold) || 2,
    made_to_order: p.madeToOrder ?? p.made_to_order ?? true,
    lead_time_weeks: Number(p.leadTimeWeeks ?? p.lead_time_weeks) || 3,
    customization_enabled: p.customizationEnabled ?? p.customization_enabled ?? true,
    customization_options: p.customizationOptions ?? p.customization_options ?? {},
    customization_tolerance_cm: Number(p.customizationToleranceCm ?? p.customization_tolerance_cm) || 15,
    allow_com_upholstery: p.allowComUpholstery ?? p.allow_com_upholstery ?? true,
    meta_title: p.metaTitle ?? p.meta_title ?? `${p.name || 'Product'} | CouchKraft`,
    meta_description: p.metaDescription ?? p.meta_description ?? '',
    status: p.status || 'published',
    gst_slab: p.gstSlab ?? p.gst_slab ?? '18% GST (Standard Furniture)',
    hsn_code: p.hsnCode ?? p.hsn_code ?? '9403 6000',
  }
}

function fromProductDbRow(row: any): Record<string, any> {
  return {
    ...row,
    compareAt: Number(row.compare_at ?? row.compareAt) || 0,
    subCategory: row.sub_category ?? row.subCategory ?? 'Standard',
    shortExcerpt: row.short_excerpt ?? row.shortExcerpt ?? '',
    videoUrl: row.video_url ?? row.videoUrl ?? '',
    colorSwatches: row.color_swatches ?? row.colorSwatches ?? [],
    netWeight: row.net_weight ?? row.netWeight ?? '',
    seatingCapacity: row.seating_capacity ?? row.seatingCapacity ?? '',
    structuralWood: row.structural_wood ?? row.structuralWood ?? '',
    foamUpholstery: row.foam_upholstery ?? row.foamUpholstery ?? '',
    readyToShipStock: Number(row.ready_to_ship_stock ?? row.readyToShipStock) || 0,
    lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold) || 2,
    madeToOrder: row.made_to_order ?? row.madeToOrder ?? true,
    leadTimeWeeks: Number(row.lead_time_weeks ?? row.leadTimeWeeks) || 3,
    customizationEnabled: row.customization_enabled ?? row.customizationEnabled ?? true,
    customizationOptions: row.customization_options ?? row.customizationOptions ?? {},
    customizationToleranceCm: Number(row.customization_tolerance_cm ?? row.customizationToleranceCm) || 15,
    allowComUpholstery: row.allow_com_upholstery ?? row.allowComUpholstery ?? true,
    metaTitle: row.meta_title ?? row.metaTitle ?? '',
    metaDescription: row.meta_description ?? row.metaDescription ?? '',
    gstSlab: row.gst_slab ?? row.gstSlab ?? '18% GST (Standard Furniture)',
    hsnCode: row.hsn_code ?? row.hsnCode ?? '9403 6000',
    categoryId: row.category_id ?? row.categoryId ?? 'cat_sofas',
  }
}

function normalizeOrder(o: any) {
  const items = Array.isArray(o.items) ? o.items : []
  return {
    ...o,
    id: o.id,
    number: o.number || 'CK-ORD',
    customerId: o.customer_id || o.customerId || null,
    total: Number(o.total) || 0,
    subtotal: Number(o.subtotal) || 0,
    items,
    paymentStatus: o.payment_status || o.paymentStatus || 'pending',
    fulfilmentStatus: o.fulfilment_status || o.fulfilmentStatus || 'placed',
    createdAt: o.created_at || o.createdAt || new Date().toISOString(),
    contact: o.address ? { name: o.address.name || o.address.line1, email: '', phone: o.address.phone || '' } : o.contact,
    trackingNumber: o.tracking_number || o.trackingNumber || '',
    paymentMethod: o.payment_method || o.paymentMethod || 'demo',
  }
}

export const adminApi = {
  login: async (email: string, password: string) => {
    try {
      await supabase.from('admins').select('id, email').eq('email', email.trim().toLowerCase()).limit(1)
    } catch {}
    return backendRequest<{ admin: any; token: string }>(`${BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  logout: () => backendRequest(`${BASE}/auth/logout`, { method: 'POST' }),
  me: () => backendRequest<{ admin: any }>(`${BASE}/auth/me`),

  dashboardStats: async () => {
    try {
      const [prodsRes, catsRes, ordersRes, custRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
      ])

      const pList = prodsRes.data || []
      const rawOrders = ordersRes.data || []
      const oList = rawOrders.map(normalizeOrder)
      const cList = custRes.data || []

      // Calculate today and month using Indian Standard Time (IST = UTC + 5:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000
      const istNow = new Date(Date.now() + istOffsetMs)
      const istYear = istNow.getUTCFullYear()
      const istMonth = istNow.getUTCMonth()
      const istDate = istNow.getUTCDate()
      const todayStart = Date.UTC(istYear, istMonth, istDate) - istOffsetMs
      const monthStart = Date.UTC(istYear, istMonth, 1) - istOffsetMs

      // Calculate qualifying paid orders (separating live orders from test payments)
      const paidOrders = oList.filter((o: any) => o.paymentStatus === 'paid')
      const livePaidOrders = paidOrders.filter((o: any) => o.paymentMethod !== 'demo' && !o.razorpayPaymentId?.startsWith('pay_demo_'))
      const revenueSource = livePaidOrders.length > 0 ? livePaidOrders : paidOrders

      const todayOrders = revenueSource.filter((o: any) => {
        const t = new Date(o.createdAt).getTime()
        return t >= todayStart
      })

      const monthOrders = revenueSource.filter((o: any) => {
        const t = new Date(o.createdAt).getTime()
        return t >= monthStart
      })

      const todaySales = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
      const monthlySales = monthOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
      const totalRevenue = revenueSource.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)

      const totalOrders = oList.length
      const deliveredOrders = oList.filter((o: any) => o.fulfilmentStatus === 'delivered').length
      const pendingOrders = oList.filter((o: any) => o.fulfilmentStatus !== 'delivered').length

      const lowStockCount = pList.filter((p: any) => {
        const stock = Number(p.ready_to_ship_stock ?? p.readyToShipStock) || 0
        const thresh = Number(p.low_stock_threshold ?? p.lowStockThreshold) || 2
        return stock <= thresh
      }).length

      return {
        todaySales,
        todayOrdersCount: todayOrders.length,
        monthlySales,
        totalRevenue,
        totalOrders,
        deliveredOrders,
        pendingOrders,
        customerCount: cList.length,
        totalProducts: pList.length,
        lowStockCount,
        pendingEnquiriesCount: 0,
        recentOrders: oList.slice(0, 10),
        categoriesCount: (catsRes.data || []).length,
      }
    } catch {
      return backendRequest<any>(`${BASE}/dashboard/stats`)
    }
  },

  getProducts: async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (!error && data && data.length) {
        return { products: data.map(fromProductDbRow) }
      }
    } catch {}
    return backendRequest<{ products: any[] }>(`${BASE}/products`)
  },

  getProduct: async (id: string) => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      if (!error && data) {
        return { product: fromProductDbRow(data) }
      }
    } catch {}
    return backendRequest<{ product: any }>(`${BASE}/products/${id}`)
  },

  createProduct: async (data: any) => {
    try {
      const row = toProductDbRow(data)
      const { data: inserted, error } = await supabase.from('products').insert([row]).select()
      if (!error && inserted && inserted.length) {
        return { ok: true, product: fromProductDbRow(inserted[0]) }
      }
    } catch {}
    return backendRequest(`${BASE}/products`, { method: 'POST', body: JSON.stringify(data) })
  },

  updateProduct: async (id: string, data: any) => {
    try {
      const row = toProductDbRow({ ...data, id })
      const { data: updated, error } = await supabase.from('products').update(row).eq('id', id).select()
      if (!error && updated && updated.length) {
        return { ok: true, product: fromProductDbRow(updated[0]) }
      }
    } catch {}
    return backendRequest(`${BASE}/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  deleteProduct: async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) return { ok: true }
    } catch {}
    return backendRequest(`${BASE}/products/${id}`, { method: 'DELETE' })
  },

  getCategories: async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (!error && data && data.length) {
        return {
          categories: data.map((c: any) => ({
            ...c,
            productCount: Number(c.product_count ?? c.productCount) || 0,
            subClassifications: c.sub_classifications || [],
          }))
        }
      }
    } catch {}
    return backendRequest<{ categories: any[] }>(`${BASE}/categories`)
  },

  createCategory: async (data: any) => {
    try {
      const slug = (data.slug || data.name || 'category')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const row = {
        id: data.id || `cat_${slug}_${Date.now().toString(36)}`,
        name: data.name || 'New Category',
        slug,
        description: data.description || '',
        image: data.image || 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80',
        sub_classifications: data.subClassifications || [],
        product_count: 0,
      }
      const { data: inserted, error } = await supabase.from('categories').insert([row]).select()
      if (!error && inserted && inserted.length) {
        return { category: { ...inserted[0], productCount: 0 } }
      }
    } catch {}
    return backendRequest(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) })
  },

  updateCategory: async (id: string, data: any) => {
    try {
      const row: Record<string, any> = { ...data }
      if (data.subClassifications) row.sub_classifications = data.subClassifications
      const { data: updated, error } = await supabase.from('categories').update(row).eq('id', id).select()
      if (!error && updated && updated.length) {
        return { category: updated[0] }
      }
    } catch {}
    return backendRequest(`${BASE}/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  deleteCategory: async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (!error) return { ok: true }
    } catch {}
    return backendRequest(`${BASE}/categories/${id}`, { method: 'DELETE' })
  },

  getInventory: async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name')
      if (!error && data && data.length) {
        return {
          inventory: data.map((p: any) => {
            const stock = Number(p.ready_to_ship_stock ?? p.readyToShipStock) || 0
            const thresh = Number(p.low_stock_threshold ?? p.lowStockThreshold) || 2
            const images = Array.isArray(p.images) ? p.images : []
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              image: images[0] || '',
              readyToShipStock: stock,
              lowStockThreshold: thresh,
              status: stock > thresh ? 'In Stock' : 'Low Stock',
              madeToOrder: p.made_to_order ?? p.madeToOrder ?? true,
              leadTimeWeeks: Number(p.lead_time_weeks ?? p.leadTimeWeeks) || 3,
            }
          })
        }
      }
    } catch {}
    return backendRequest<{ inventory: any[] }>(`${BASE}/inventory`)
  },

  getCoupons: async () => {
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
      if (!error && data && data.length) {
        return {
          coupons: data.map((c: any) => ({
            ...c,
            minOrderValue: Number(c.min_order_value ?? c.minOrderValue) || 0,
            maxDiscount: c.max_discount ?? c.maxDiscount ?? null,
            startDate: c.start_date ?? c.startDate,
            endDate: c.end_date ?? c.endDate,
            usedCount: Number(c.used_count ?? c.usedCount) || 0,
          }))
        }
      }
    } catch {}
    return backendRequest<{ coupons: any[] }>(`${BASE}/coupons`)
  },

  createCoupon: async (data: any) => {
    try {
      const code = (data.code || 'COUPON').toUpperCase().trim().replace(/\s+/g, '')
      const row = {
        id: data.id || `coup_${code.toLowerCase()}_${Date.now().toString(36)}`,
        code,
        type: data.type || 'percent',
        value: Number(data.value) || 10,
        min_order_value: Number(data.minOrderValue ?? data.min_order_value) || 0,
        max_discount: data.maxDiscount ? Number(data.maxDiscount) : null,
        active: data.active ?? true,
        description: data.description || '',
      }
      const { data: inserted, error } = await supabase.from('coupons').insert([row]).select()
      if (!error && inserted && inserted.length) {
        return { coupon: { ...inserted[0], minOrderValue: inserted[0].min_order_value } }
      }
    } catch {}
    return backendRequest(`${BASE}/coupons`, { method: 'POST', body: JSON.stringify(data) })
  },

  updateCoupon: async (id: string, data: any) => {
    try {
      const row: Record<string, any> = { ...data }
      if (data.minOrderValue !== undefined) row.min_order_value = data.minOrderValue
      const { data: updated, error } = await supabase.from('coupons').update(row).eq('id', id).select()
      if (!error && updated && updated.length) {
        return { coupon: { ...updated[0], minOrderValue: updated[0].min_order_value } }
      }
    } catch {}
    return backendRequest(`${BASE}/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },


  // Settings & WhatsApp Concierge
  getSettings: () => backendRequest<{ settings: any }>(`${BASE}/settings`),
  updateSettings: (data: any) => backendRequest<any>(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }),

  // Custom Bespoke Requests
  getCustomRequests: () => backendRequest<{ requests: any[] }>(`${BASE}/custom-requests`),
  updateCustomRequest: (id: string, data: any) =>
    backendRequest<any>(`${BASE}/custom-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCoupon: async (id: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (!error) return { ok: true }
    } catch {}
    return backendRequest(`${BASE}/coupons/${id}`, { method: 'DELETE' })
  },

  getBanners: async () => {
    try {
      const { data, error } = await supabase.from('banners').select('*').order('display_order', { ascending: true })
      if (!error && data && data.length) {
        return {
          banners: data.map((b: any) => ({
            ...b,
            desktopImage: b.desktop_image ?? b.desktopImage,
            mobileImage: b.mobile_image ?? b.mobileImage,
            ctaLabel: b.cta_label ?? b.ctaLabel,
            ctaUrl: b.cta_url ?? b.ctaUrl,
            displayOrder: Number(b.display_order ?? b.displayOrder) || 1,
          }))
        }
      }
    } catch {}
    return backendRequest<{ banners: any[] }>(`${BASE}/banners`)
  },

  createBanner: async (data: any) => {
    try {
      const row = {
        id: data.id || `banner_${Date.now().toString(36)}`,
        title: data.title || 'New Banner',
        subtitle: data.subtitle || '',
        desktop_image: data.desktopImage || data.desktop_image || '/hero-living-hd.jpg',
        mobile_image: data.mobileImage || data.mobile_image || '/hero-living-scene.jpg',
        cta_label: data.ctaLabel || data.cta_label || 'Shop Collection',
        cta_url: data.ctaUrl || data.cta_url || '/shop',
        badge: data.badge || 'PROMOTIONAL',
        alignment: data.alignment || 'right',
        tone: data.tone || 'dark',
        space: data.space || 'living',
        active: data.active ?? true,
        display_order: Number(data.displayOrder ?? data.display_order) || 1,
      }
      const { data: inserted, error } = await supabase.from('banners').insert([row]).select()
      if (!error && inserted && inserted.length) {
        return {
          banner: {
            ...inserted[0],
            desktopImage: inserted[0].desktop_image,
            mobileImage: inserted[0].mobile_image,
            ctaLabel: inserted[0].cta_label,
            ctaUrl: inserted[0].cta_url,
          }
        }
      }
    } catch {}
    return backendRequest(`${BASE}/banners`, { method: 'POST', body: JSON.stringify(data) })
  },

  updateBanner: async (id: string, data: any) => {
    try {
      const row: Record<string, any> = { ...data }
      if (data.desktopImage) row.desktop_image = data.desktopImage
      if (data.mobileImage) row.mobile_image = data.mobileImage
      if (data.ctaLabel) row.cta_label = data.ctaLabel
      if (data.ctaUrl) row.cta_url = data.ctaUrl
      if (data.displayOrder !== undefined) row.display_order = data.displayOrder

      const { data: updated, error } = await supabase.from('banners').update(row).eq('id', id).select()
      if (!error && updated && updated.length) {
        return {
          banner: {
            ...updated[0],
            desktopImage: updated[0].desktop_image,
            mobileImage: updated[0].mobile_image,
            ctaLabel: updated[0].cta_label,
            ctaUrl: updated[0].cta_url,
          }
        }
      }
    } catch {}
    return backendRequest(`${BASE}/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  deleteBanner: async (id: string) => {
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id)
      if (!error) return { ok: true }
    } catch {}
    return backendRequest(`${BASE}/banners/${id}`, { method: 'DELETE' })
  },

  getOrders: async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (!error && data && data.length) {
        return { orders: data.map(normalizeOrder) }
      }
    } catch {}
    return backendRequest<{ orders: any[] }>(`${BASE}/orders`)
  },

  updateOrderStatus: async (id: string, data: any) => {
    try {
      const row: Record<string, any> = { updated_at: new Date().toISOString() }
      if (data.paymentStatus) row.payment_status = data.paymentStatus
      if (data.fulfilmentStatus) row.fulfilment_status = data.fulfilmentStatus
      if (data.trackingNumber !== undefined) row.tracking_number = data.trackingNumber

      const { data: updated, error } = await supabase.from('orders').update(row).eq('id', id).select()
      if (!error && updated && updated.length) {
        return { order: normalizeOrder(updated[0]) }
      }
    } catch {}
    return backendRequest<{ order: any }>(`${BASE}/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(data) })
  },

  getCustomers: async () => {
    try {
      const [custRes, ordRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*'),
      ])
      const cList = custRes.data || []
      const oList = (ordRes.data || []).map(normalizeOrder)

      return {
        customers: cList.map((c: any) => {
          const custOrders = oList.filter((o: any) => o.customerId === c.id)
          const totalSpent = custOrders.reduce((sum: number, o: any) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0)
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            emailVerified: Boolean(c.email_verified),
            ordersCount: custOrders.length,
            totalSpent,
            createdAt: c.created_at || c.createdAt,
          }
        })
      }
    } catch {
      return backendRequest<{ customers: any[] }>(`${BASE}/customers`)
    }
  },
}
