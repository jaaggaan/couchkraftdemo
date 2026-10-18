import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'

export type Coupon = {
  id: string
  code: string
  type: 'percent' | 'flat'
  value: number
  minOrderValue: number
  maxDiscount?: number
  startDate: string
  endDate: string
  usageLimit?: number
  usedCount: number
  active: boolean
  description: string
  createdAt: string
  updatedAt: string
}

export type PromotionalBanner = {
  id: string
  title: string
  subtitle: string
  desktopImage: string
  mobileImage: string
  ctaLabel: string
  ctaUrl: string
  badge: string
  alignment: 'left' | 'center' | 'right'
  tone: 'dark' | 'light'
  space: string
  active: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

const dataDir = dataDirectory()
const couponsPath = resolve(dataDir, 'coupons.json')
const bannersPath = resolve(dataDir, 'banners.json')

const initialCoupons: Coupon[] = [
  {
    id: 'coup_warm10',
    code: 'WARM10',
    type: 'percent',
    value: 10,
    minOrderValue: 20000,
    maxDiscount: 15000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    usageLimit: 500,
    usedCount: 38,
    active: true,
    description: '10% off on all living and lounge handcrafted silhouettes.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'coup_festive15',
    code: 'FESTIVE15',
    type: 'percent',
    value: 15,
    minOrderValue: 50000,
    maxDiscount: 25000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    usageLimit: 200,
    usedCount: 14,
    active: true,
    description: 'Special Diwali & Festive season tier discount.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'coup_welcome5k',
    code: 'WELCOME5000',
    type: 'flat',
    value: 5000,
    minOrderValue: 75000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
    usageLimit: 1000,
    usedCount: 82,
    active: true,
    description: '₹5,000 off on first bespoke order above ₹75,000.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const initialBanners: PromotionalBanner[] = [
  {
    id: 'banner_living',
    title: 'In soft sculpture',
    subtitle: 'A quiet oak frame and generous bouclé contours that belong in a sunlit living room.',
    desktopImage: '/hero-living-hd.jpg',
    mobileImage: '/hero-living-scene.jpg',
    ctaLabel: 'Shop the Collection',
    ctaUrl: '/shop?space=living',
    badge: 'NEW COLLECTION 2026',
    alignment: 'right',
    tone: 'dark',
    space: 'living',
    active: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner_dining',
    title: 'Gather beautifully',
    subtitle: 'Solid teakwood dining centerpieces engineered for generational memory.',
    desktopImage: '/hero-dining-hd.jpg',
    mobileImage: '/hero-dining.jpg',
    ctaLabel: 'Explore Dining',
    ctaUrl: '/shop?space=dining',
    badge: 'EDITORIAL FEATURE',
    alignment: 'left',
    tone: 'dark',
    space: 'dining',
    active: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner_lounge',
    title: 'A quieter kind of comfort',
    subtitle: 'Deep sloped seats contoured around sustainably sourced Sheesham wood.',
    desktopImage: '/hero-lounge-hd.jpg',
    mobileImage: '/hero-lounge.jpg',
    ctaLabel: 'Discover Lounge',
    ctaUrl: '/shop?space=lounge',
    badge: 'BESTSELLER',
    alignment: 'right',
    tone: 'dark',
    space: 'lounge',
    active: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

  if (!existsSync(couponsPath)) {
    writeFileSync(couponsPath, JSON.stringify(initialCoupons, null, 2), 'utf8')
  }

  if (!existsSync(bannersPath)) {
    writeFileSync(bannersPath, JSON.stringify(initialBanners, null, 2), 'utf8')
  }
}

export function readCoupons(): Coupon[] {
  ensureStore()
  try {
    return JSON.parse(readFileSync(couponsPath, 'utf8')) as Coupon[]
  } catch {
    return []
  }
}

export function writeCoupons(coupons: Coupon[]) {
  ensureStore()
  writeFileSync(couponsPath, JSON.stringify(coupons, null, 2), 'utf8')
}

export function findCouponByCode(code: string): Coupon | null {
  const coupons = readCoupons()
  return coupons.find((c) => c.code.toUpperCase() === code.toUpperCase().trim()) ?? null
}

export function createCoupon(input: Partial<Coupon>): Coupon {
  const coupons = readCoupons()
  const code = (input.code || 'COUPON').toUpperCase().trim().replace(/\s+/g, '')
  const newCoupon: Coupon = {
    id: input.id || `coup_${Date.now()}`,
    code,
    type: input.type || 'percent',
    value: Number(input.value) || 10,
    minOrderValue: Number(input.minOrderValue) || 0,
    maxDiscount: input.maxDiscount ? Number(input.maxDiscount) : undefined,
    startDate: input.startDate || new Date().toISOString(),
    endDate: input.endDate || new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    usageLimit: input.usageLimit ? Number(input.usageLimit) : undefined,
    usedCount: 0,
    active: input.active ?? true,
    description: input.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  coupons.unshift(newCoupon)
  writeCoupons(coupons)
  return newCoupon
}

export function updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
  const coupons = readCoupons()
  const idx = coupons.findIndex((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase())
  if (idx === -1) return null
  coupons[idx] = {
    ...coupons[idx],
    ...updates,
    id: coupons[idx].id,
    code: (updates.code || coupons[idx].code).toUpperCase().trim(),
    updatedAt: new Date().toISOString(),
  }
  writeCoupons(coupons)
  return coupons[idx]
}

export function deleteCoupon(id: string): boolean {
  const coupons = readCoupons()
  const filtered = coupons.filter((c) => c.id !== id && c.code.toUpperCase() !== id.toUpperCase())
  if (filtered.length === coupons.length) return false
  writeCoupons(filtered)
  return true
}

export function readBanners(): PromotionalBanner[] {
  ensureStore()
  try {
    const banners = JSON.parse(readFileSync(bannersPath, 'utf8')) as PromotionalBanner[]
    return banners.sort((a, b) => a.displayOrder - b.displayOrder)
  } catch {
    return []
  }
}

export function writeBanners(banners: PromotionalBanner[]) {
  ensureStore()
  writeFileSync(bannersPath, JSON.stringify(banners, null, 2), 'utf8')
}

export function createBanner(input: Partial<PromotionalBanner>): PromotionalBanner {
  const banners = readBanners()
  const newBanner: PromotionalBanner = {
    id: input.id || `banner_${Date.now()}`,
    title: input.title || 'New Banner Headline',
    subtitle: input.subtitle || '',
    desktopImage: input.desktopImage || '/hero-living-hd.jpg',
    mobileImage: input.mobileImage || '/hero-living-scene.jpg',
    ctaLabel: input.ctaLabel || 'Explore Collection',
    ctaUrl: input.ctaUrl || '/shop',
    badge: input.badge || 'PROMOTIONAL',
    alignment: input.alignment || 'right',
    tone: input.tone || 'dark',
    space: input.space || 'living',
    active: input.active ?? true,
    displayOrder: input.displayOrder || banners.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  banners.push(newBanner)
  writeBanners(banners)
  return newBanner
}

export function updateBanner(id: string, updates: Partial<PromotionalBanner>): PromotionalBanner | null {
  const banners = readBanners()
  const idx = banners.findIndex((b) => b.id === id)
  if (idx === -1) return null
  banners[idx] = {
    ...banners[idx],
    ...updates,
    id: banners[idx].id,
    updatedAt: new Date().toISOString(),
  }
  writeBanners(banners)
  return banners[idx]
}

export function deleteBanner(id: string): boolean {
  const banners = readBanners()
  const filtered = banners.filter((b) => b.id !== id)
  if (filtered.length === banners.length) return false
  writeBanners(filtered)
  return true
}
