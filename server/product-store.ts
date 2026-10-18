import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDirectory } from './data-path.ts'
import { products as initialProducts, type Product as BaseProduct } from '../src/data/products.ts'

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

const dataDir = dataDirectory()
const productsPath = resolve(dataDir, 'products.json')
const categoriesPath = resolve(dataDir, 'categories.json')

const initialCategories: Category[] = [
  {
    id: 'cat_sofas',
    name: 'Living Room > Sofas & Couches',
    slug: 'sofas-and-couches',
    subClassifications: ['3-Seater Sofas', 'Sectionals & L-Shapes', 'Chesterfield Sofas', 'Modular Loungers'],
    description: 'Artisanal sofas crafted from kiln-dried hardwood and organic Belgian fabrics.',
    image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80',
    productCount: 1,
  },
  {
    id: 'cat_chairs',
    name: 'Bedroom > Lounge Chairs',
    slug: 'lounge-chairs',
    subClassifications: ['Accent Chairs', 'Recliners', 'Rocking Chairs'],
    description: 'Sculptural seating designed for quiet reading and relaxed conversation.',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
    productCount: 1,
  },
  {
    id: 'cat_storage',
    name: 'Dining > Benches & Storage',
    slug: 'benches-and-storage',
    subClassifications: ['Sideboards', 'Credenzas', 'Dining Benches'],
    description: 'Minimalist wooden storage units with architectural proportions.',
    image: 'https://images.unsplash.com/photo-1611967164521-abae8fba4668?auto=format&fit=crop&w=600&q=80',
    productCount: 1,
  },
  {
    id: 'cat_accent',
    name: 'Study > Accent Seating',
    slug: 'accent-seating',
    subClassifications: ['Daybeds', 'Ottomans', 'Chaise Lounges'],
    description: 'Versatile handcrafted accent daybeds and sloped seating.',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
    productCount: 1,
  },
]

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

  if (!existsSync(categoriesPath)) {
    writeFileSync(categoriesPath, JSON.stringify(initialCategories, null, 2), 'utf8')
  }

  if (!existsSync(productsPath)) {
    const seeded: Product[] = initialProducts.map((p, idx) => {
      const isArden = p.id === 'ck-arden-sofa'
      return {
        ...p,
        sku: isArden ? 'CK-SOF-001' : `CK-PRD-${String(idx + 1).padStart(3, '0')}`,
        price: isArden ? 78000 : p.price,
        compareAt: isArden ? 95000 : Math.round(p.price * 1.2),
        gstSlab: '18% GST (Standard Furniture)',
        hsnCode: '9403 6000',
        subCategory: isArden ? '3-Seater Sofas' : 'Standard',
        shortExcerpt: isArden
          ? 'Clean mid-century lines wrapped in natural woven textures. Ergonomic sloped cushions sculpted over sustainably sourced teakwood.'
          : p.description.slice(0, 140),
        description: isArden
          ? 'The Arden Sofa embodies our philosophy of quiet luxury. Engineered for longevity, the structure integrates hand-carved kiln-dried teakwood arms with a supportive serpentine spring assembly. The cushions are enveloped in Belgian-milled linen blend fabric, resistant to piling and softly textured to the touch.\n\nEvery silhouette line is smoothed to architectural perfection, delivering a calm presence in both light-drenched contemporary apartments and storied traditional residences.'
          : p.description,
        videoUrl: isArden ? 'https://youtube.com/watch?v=couchkraft-arden-craft' : '',
        colorSwatches: isArden
          ? [
              { name: 'Terracotta Rust', hex: '#B35438', skuCode: 'SKU-TRC', active: true },
              { name: 'Warm Ivory', hex: '#E8DFC9', skuCode: 'SKU-WIV', active: true },
              { name: 'Olive Green', hex: '#5D6B57', skuCode: 'SKU-OLV', active: true },
              { name: 'Muted Taupe', hex: '#9C8F84', skuCode: 'SKU-MTP', active: true },
            ]
          : [
              { name: 'Natural Oak', hex: '#D2B48C', skuCode: 'SKU-NAT', active: true },
              { name: 'Warm Oat', hex: '#E5D3B3', skuCode: 'SKU-OAT', active: true },
            ],
        dimensions: isArden
          ? { width: 215, depth: 92, height: 84, seatHeight: 44 }
          : { width: 180, depth: 85, height: 80, seatHeight: 42 },
        netWeight: isArden ? '58 kg' : '45 kg',
        seatingCapacity: isArden ? '3 Persons (Max 360 kg)' : '2 Persons',
        warranty: '5 Years Structural Frame',
        structuralWood: 'Kiln-dried Teak & Sheesham Hardwood',
        foamUpholstery: '38-Density Ultra-Cell Foam + Belgian Linen Blend',
        readyToShipStock: isArden ? 8 : 4,
        lowStockThreshold: 2,
        madeToOrder: true,
        leadTimeWeeks: 3,
        customizationEnabled: true,
        customizationToleranceCm: 15,
        allowComUpholstery: true,
        metaTitle: isArden
          ? 'Arden Three-Seater Sofa | CouchKraft Bespoke Teak Living'
          : `${p.name} | CouchKraft Artisanal Furniture`,
        metaDescription: isArden
          ? 'Buy the handcrafted Arden Three-Seater Sofa at CouchKraft. Solid kiln-dried teakwood frame wrapped in organic linen upholstery. Handcrafted in India with white-glove delivery.'
          : p.description,
        status: 'published',
        unitsSold: isArden ? 24 : 12,
        revenue: isArden ? 1872000 : 504000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
    writeFileSync(productsPath, JSON.stringify(seeded, null, 2), 'utf8')
  }
}

export function readProducts(): Product[] {
  ensureStore()
  try {
    return JSON.parse(readFileSync(productsPath, 'utf8')) as Product[]
  } catch {
    return []
  }
}

export function writeProducts(products: Product[]) {
  ensureStore()
  writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8')
}

export function findProductById(id: string): Product | null {
  const products = readProducts()
  return products.find((p) => p.id === id || p.slug === id) ?? null
}

export function createProduct(input: Partial<Product>): Product {
  const products = readProducts()
  const slug = (input.slug || input.name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  
  const id = input.id || `ck-${slug}-${Date.now().toString(36)}`
  const newProduct: Product = {
    id,
    slug,
    name: input.name || 'Untitled Product',
    sku: input.sku || `CK-GEN-${Date.now().toString(36).toUpperCase()}`,
    price: Number(input.price) || 0,
    compareAt: Number(input.compareAt) || Math.round((Number(input.price) || 0) * 1.2),
    gstSlab: input.gstSlab || '18% GST (Standard Furniture)',
    hsnCode: input.hsnCode || '9403 6000',
    description: input.description || '',
    shortExcerpt: input.shortExcerpt || '',
    category: input.category || 'Living Room > Sofas & Couches',
    subCategory: input.subCategory || 'General',
    space: input.space || 'living',
    tabs: input.tabs || ['bestsellers', 'new'],
    images: input.images && input.images.length ? input.images : [
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80'
    ],
    videoUrl: input.videoUrl || '',
    finishes: input.finishes || ['Standard'],
    colorSwatches: input.colorSwatches || [
      { name: 'Terracotta Rust', hex: '#B35438', skuCode: 'SKU-TRC', active: true },
      { name: 'Warm Ivory', hex: '#E8DFC9', skuCode: 'SKU-WIV', active: true },
    ],
    care: input.care || 'Vacuum gently with soft brush. Spot clean with dry solvent cleaner.',
    dimensions: input.dimensions || { width: 200, depth: 90, height: 80, seatHeight: 42 },
    netWeight: input.netWeight || '50 kg',
    seatingCapacity: input.seatingCapacity || '3 Persons',
    warranty: input.warranty || '5 Years Structural Frame',
    structuralWood: input.structuralWood || 'Kiln-dried Teak & Sheesham Hardwood',
    foamUpholstery: input.foamUpholstery || '38-Density Ultra-Cell Foam + Belgian Linen Blend',
    readyToShipStock: Number(input.readyToShipStock) || 0,
    lowStockThreshold: Number(input.lowStockThreshold) || 2,
    madeToOrder: input.madeToOrder ?? true,
    leadTimeWeeks: Number(input.leadTimeWeeks) || 3,
    customizationEnabled: input.customizationEnabled ?? true,
    customizationOptions: input.customizationOptions || undefined,
    customizationToleranceCm: Number(input.customizationToleranceCm) || 15,
    allowComUpholstery: input.allowComUpholstery ?? true,
    metaTitle: input.metaTitle || `${input.name || 'Piece'} | CouchKraft`,
    metaDescription: input.metaDescription || (input.shortExcerpt || input.description || '').slice(0, 160),
    status: input.status || 'published',
    unitsSold: Number(input.unitsSold) || 0,
    revenue: Number(input.revenue) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  products.unshift(newProduct)
  writeProducts(products)
  return newProduct
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const products = readProducts()
  const idx = products.findIndex((p) => p.id === id || p.slug === id)
  if (idx === -1) return null

  const existing = products[idx]
  const updated: Product = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }
  products[idx] = updated
  writeProducts(products)
  return updated
}

export function deleteProduct(id: string): boolean {
  const products = readProducts()
  const filtered = products.filter((p) => p.id !== id && p.slug !== id)
  if (filtered.length === products.length) return false
  writeProducts(filtered)
  return true
}

export function readCategories(): Category[] {
  ensureStore()
  try {
    const categories = JSON.parse(readFileSync(categoriesPath, 'utf8')) as Category[]
    const products = readProducts()
    return categories.map((cat) => ({
      ...cat,
      productCount: products.filter((p) => p.category === cat.name || p.category.includes(cat.name.split('>')[0].trim())).length,
    }))
  } catch {
    return []
  }
}

export function writeCategories(categories: Category[]) {
  ensureStore()
  writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf8')
}

export function createCategory(input: Partial<Category>): Category {
  const categories = readCategories()
  const slug = (input.slug || input.name || 'category')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
  const newCat: Category = {
    id: input.id || `cat_${Date.now()}`,
    name: input.name || 'New Category',
    slug,
    subClassifications: input.subClassifications || [],
    description: input.description || '',
    image: input.image || 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80',
    productCount: 0,
  }
  categories.push(newCat)
  writeCategories(categories)
  return newCat
}

export function updateCategory(id: string, updates: Partial<Category>): Category | null {
  const categories = readCategories()
  const idx = categories.findIndex((c) => c.id === id || c.slug === id)
  if (idx === -1) return null
  categories[idx] = { ...categories[idx], ...updates, id: categories[idx].id }
  writeCategories(categories)
  return categories[idx]
}

export function deleteCategory(id: string): boolean {
  const categories = readCategories()
  const filtered = categories.filter((c) => c.id !== id && c.slug !== id)
  if (filtered.length === categories.length) return false
  writeCategories(filtered)
  return true
}
