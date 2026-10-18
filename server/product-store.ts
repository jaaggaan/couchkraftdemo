import { supabase } from './supabase-client.ts'
import type { Product as BaseProduct } from '../src/data/products.ts'

export type ColorSwatch = {
  name: string
  hex: string
  skuCode: string
  active: boolean
}

export type ProductDimensions = {
  width: number
  depth: number
  height: number
  seatHeight: number
  customizationOptions?: any
}

export type Product = BaseProduct & {
  sku: string
  compareAt: number
  gstSlab: string
  hsnCode: string
  subCategory: string
  shortExcerpt: string
  videoUrl: string
  colorSwatches: ColorSwatch[]
  dimensions: ProductDimensions
  netWeight: string
  seatingCapacity: string
  warranty: string
  structuralWood: string
  foamUpholstery: string
  readyToShipStock: number
  lowStockThreshold: number
  madeToOrder: boolean
  leadTimeWeeks: number
  customizationEnabled: boolean
  customizationOptions?: any
  customizationToleranceCm: number
  allowComUpholstery: boolean
  metaTitle: string
  metaDescription: string
  status: 'draft' | 'published'
  unitsSold: number
  revenue: number
  createdAt: string
  updatedAt: string
}

export type Category = {
  id: string
  name: string
  slug: string
  subClassifications: string[]
  description: string
  image: string
  productCount: number
}

export function resolveCategoryId(categoryName: string, explicitId?: string): string {
  if (explicitId && ['cat_sofas', 'cat_chairs', 'cat_storage', 'cat_accent'].includes(explicitId)) {
    return explicitId
  }
  const lower = (categoryName || '').toLowerCase()
  if (lower.includes('chair') || lower.includes('lounge')) return 'cat_chairs'
  if (lower.includes('storage') || lower.includes('bench') || lower.includes('dining') || lower.includes('table') || lower.includes('sideboard')) return 'cat_storage'
  if (lower.includes('accent') || lower.includes('study') || lower.includes('daybed') || lower.includes('bed') || lower.includes('mirror') || lower.includes('lighting') || lower.includes('light') || lower.includes('ottoman')) return 'cat_accent'
  return 'cat_sofas'
}

function toProductDbRow(p: any): Record<string, any> {
  const name = String(p.name || 'Untitled Piece').trim()
  const slug = (p.slug || name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const categoryName = p.category || 'Living Room > Sofas & Couches'
  const categoryId = resolveCategoryId(categoryName, p.categoryId || p.category_id)

  const dimensions = p.dimensions && typeof p.dimensions === 'object'
    ? { ...p.dimensions }
    : { width: 200, depth: 90, height: 80, seatHeight: 42 }

  if (p.customizationOptions) {
    dimensions.customizationOptions = p.customizationOptions
  }

  return {
    id: p.id || `ck-${slug}-${Date.now().toString(36)}`,
    slug,
    name,
    sku: p.sku || `CK-SKU-${Date.now().toString(36).toUpperCase()}`,
    price: Number(p.price) || 0,
    compare_at: Number(p.compareAt ?? p.compare_at) || 0,
    category_id: categoryId,
    category: categoryName,
    sub_category: p.subCategory ?? p.sub_category ?? 'Standard',
    space: p.space || 'living',
    tabs: Array.isArray(p.tabs) ? p.tabs : ['bestsellers'],
    short_excerpt: p.shortExcerpt ?? p.short_excerpt ?? '',
    description: p.description || '',
    images: Array.isArray(p.images) && p.images.length ? p.images : [
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80'
    ],
    video_url: p.videoUrl ?? p.video_url ?? '',
    finishes: Array.isArray(p.finishes) ? p.finishes : ['Standard'],
    color_swatches: Array.isArray(p.colorSwatches ?? p.color_swatches) ? (p.colorSwatches ?? p.color_swatches) : [],
    care: p.care || '',
    dimensions,
    net_weight: p.netWeight ?? p.net_weight ?? '50 kg',
    seating_capacity: p.seatingCapacity ?? p.seating_capacity ?? '3 Persons',
    warranty: p.warranty || '5 Years Structural Frame',
    structural_wood: p.structuralWood ?? p.structural_wood ?? 'Kiln-dried Teak & Sheesham Hardwood',
    foam_upholstery: p.foamUpholstery ?? p.foam_upholstery ?? '38-Density Ultra-Cell Foam + Belgian Linen Blend',
    ready_to_ship_stock: Number(p.readyToShipStock ?? p.ready_to_ship_stock) || 0,
    low_stock_threshold: Number(p.lowStockThreshold ?? p.low_stock_threshold) || 2,
    made_to_order: p.madeToOrder ?? p.made_to_order ?? true,
    lead_time_weeks: Number(p.leadTimeWeeks ?? p.lead_time_weeks) || 3,
    customization_enabled: p.customizationEnabled ?? p.customization_enabled ?? true,
    customization_tolerance_cm: Number(p.customizationToleranceCm ?? p.customization_tolerance_cm) || 15,
    allow_com_upholstery: p.allowComUpholstery ?? p.allow_com_upholstery ?? true,
    meta_title: p.metaTitle ?? p.meta_title ?? `${name} | CouchKraft`,
    meta_description: p.metaDescription ?? p.meta_description ?? (p.shortExcerpt || p.description || '').slice(0, 160),
    status: p.status || 'published',
    gst_slab: p.gstSlab ?? p.gst_slab ?? '18% GST (Standard Furniture)',
    hsn_code: p.hsnCode ?? p.hsn_code ?? '9403 6000',
  }
}

function fromProductDbRow(row: any): Product {
  const dims = row.dimensions && typeof row.dimensions === 'object' ? row.dimensions : { width: 200, depth: 90, height: 80, seatHeight: 42 }
  const customizationOptions = row.customization_options ?? dims.customizationOptions ?? undefined

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku || '',
    price: Number(row.price) || 0,
    compareAt: Number(row.compare_at ?? row.compareAt) || 0,
    gstSlab: row.gst_slab ?? row.gstSlab ?? '18% GST (Standard Furniture)',
    hsnCode: row.hsn_code ?? row.hsnCode ?? '9403 6000',
    description: row.description || '',
    shortExcerpt: row.short_excerpt ?? row.shortExcerpt ?? '',
    category: row.category || 'Living Room > Sofas & Couches',
    subCategory: row.sub_category ?? row.subCategory ?? 'Standard',
    space: row.space || 'living',
    tabs: Array.isArray(row.tabs) ? row.tabs : ['bestsellers'],
    images: Array.isArray(row.images) && row.images.length ? row.images : [],
    videoUrl: row.video_url ?? row.videoUrl ?? '',
    finishes: Array.isArray(row.finishes) ? row.finishes : ['Standard'],
    colorSwatches: Array.isArray(row.color_swatches ?? row.colorSwatches) ? (row.color_swatches ?? row.colorSwatches) : [],
    care: row.care || '',
    dimensions: {
      width: Number(dims.width) || 200,
      depth: Number(dims.depth) || 90,
      height: Number(dims.height) || 80,
      seatHeight: Number(dims.seatHeight) || 42,
    },
    netWeight: row.net_weight ?? row.netWeight ?? '50 kg',
    seatingCapacity: row.seating_capacity ?? row.seatingCapacity ?? '3 Persons',
    warranty: row.warranty || '5 Years Structural Frame',
    structuralWood: row.structural_wood ?? row.structuralWood ?? 'Kiln-dried Teak & Sheesham Hardwood',
    foamUpholstery: row.foam_upholstery ?? row.foamUpholstery ?? '38-Density Ultra-Cell Foam + Belgian Linen Blend',
    readyToShipStock: Number(row.ready_to_ship_stock ?? row.readyToShipStock) || 0,
    lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold) || 2,
    madeToOrder: row.made_to_order ?? row.madeToOrder ?? true,
    leadTimeWeeks: Number(row.lead_time_weeks ?? row.leadTimeWeeks) || 3,
    customizationEnabled: row.customization_enabled ?? row.customizationEnabled ?? true,
    customizationOptions,
    customizationToleranceCm: Number(row.customization_tolerance_cm ?? row.customizationToleranceCm) || 15,
    allowComUpholstery: row.allow_com_upholstery ?? row.allowComUpholstery ?? true,
    metaTitle: row.meta_title ?? row.metaTitle ?? `${row.name} | CouchKraft`,
    metaDescription: row.meta_description ?? row.metaDescription ?? '',
    status: row.status || 'published',
    unitsSold: Number(row.units_sold ?? row.unitsSold) || 0,
    revenue: Number(row.revenue) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export async function readProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ProductStore] Supabase read error:', error.message)
    throw new Error(`Failed to read products from Supabase: ${error.message}`)
  }

  return (data || []).map(fromProductDbRow)
}

export async function findProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle()

  if (error) {
    console.error('[ProductStore] Supabase findProductById error:', error.message)
    return null
  }

  return data ? fromProductDbRow(data) : null
}

export async function createProduct(input: Partial<Product>): Promise<Product> {
  if (!input.name || !input.name.trim()) {
    throw new Error('Product name is required.')
  }

  const row = toProductDbRow(input)
  const { data, error } = await supabase
    .from('products')
    .insert([row])
    .select()

  if (error) {
    console.error('[ProductStore] Supabase createProduct error:', error.message)
    throw new Error(`Database error creating product: ${error.message}`)
  }

  if (!data || !data.length) {
    throw new Error('Failed to create product in database.')
  }

  return fromProductDbRow(data[0])
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const row = toProductDbRow({ ...updates, id })
  const { id: _, ...updatePayload } = row

  const { data, error } = await supabase
    .from('products')
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) {
    console.error('[ProductStore] Supabase updateProduct error:', error.message)
    throw new Error(`Database error updating product: ${error.message}`)
  }

  if (!data || !data.length) {
    return null
  }

  return fromProductDbRow(data[0])
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[ProductStore] Supabase deleteProduct error:', error.message)
    throw new Error(`Database error deleting product: ${error.message}`)
  }

  return true
}

export async function readCategories(): Promise<Category[]> {
  const [catsRes, prodsRes] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('products').select('category, category_id'),
  ])

  if (catsRes.error) {
    console.error('[ProductStore] Supabase readCategories error:', catsRes.error.message)
    throw new Error(`Database error reading categories: ${catsRes.error.message}`)
  }

  const products = prodsRes.data || []

  return (catsRes.data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subClassifications: cat.sub_classifications || [],
    description: cat.description || '',
    image: cat.image || '',
    productCount: products.filter(
      (p: any) => p.category_id === cat.id || p.category === cat.name || p.category?.includes(cat.name.split('>')[0].trim())
    ).length,
  }))
}

export async function createCategory(input: Partial<Category>): Promise<Category> {
  const slug = (input.slug || input.name || 'category')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')

  const newCat = {
    id: input.id || `cat_${Date.now()}`,
    name: input.name || 'New Category',
    slug,
    sub_classifications: input.subClassifications || [],
    description: input.description || '',
    image: input.image || 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80',
    product_count: 0,
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([newCat])
    .select()

  if (error) {
    console.error('[ProductStore] Supabase createCategory error:', error.message)
    throw new Error(`Database error creating category: ${error.message}`)
  }

  return {
    id: data[0].id,
    name: data[0].name,
    slug: data[0].slug,
    subClassifications: data[0].sub_classifications || [],
    description: data[0].description || '',
    image: data[0].image || '',
    productCount: 0,
  }
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const patch: Record<string, any> = {}
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.slug !== undefined) patch.slug = updates.slug
  if (updates.subClassifications !== undefined) patch.sub_classifications = updates.subClassifications
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.image !== undefined) patch.image = updates.image

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()

  if (error) {
    console.error('[ProductStore] Supabase updateCategory error:', error.message)
    throw new Error(`Database error updating category: ${error.message}`)
  }

  if (!data || !data.length) return null

  return {
    id: data[0].id,
    name: data[0].name,
    slug: data[0].slug,
    subClassifications: data[0].sub_classifications || [],
    description: data[0].description || '',
    image: data[0].image || '',
    productCount: 0,
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[ProductStore] Supabase deleteCategory error:', error.message)
    throw new Error(`Database error deleting category: ${error.message}`)
  }

  return true
}
