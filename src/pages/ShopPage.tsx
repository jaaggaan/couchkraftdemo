import { buildCustomFurnitureWhatsAppMessage, getWhatsAppUrl, COUCHKRAFT_WHATSAPP_PHONE } from '../utils/whatsapp'
import { useState } from 'react'
import { CustomRequestModal } from '../components/CustomRequestModal'
import { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { useSearchParams } from 'react-router-dom'
import { type ProductSpace } from '../data/products'
import { ProductGrid } from '../components/ProductCard'

const spaces: { id: ProductSpace | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'living', label: 'Living' },
  { id: 'dining', label: 'Dining' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'lounge', label: 'Lounge' },
]

const types = ['Sofa', 'Chair', 'Table', 'Bed', 'Daybed', 'Ottoman', 'Storage', 'Mirror', 'Lighting'] as const

export function ShopPage() {
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const space = (params.get('space') as ProductSpace | null) ?? 'all'
  const type = params.get('type') ?? 'all'
  const sort = params.get('sort') ?? 'featured'
  const q = params.get('q') ?? ''
  const { products: liveProducts } = useStore()

  const items = useMemo(() => {
    let list = q
      ? liveProducts.filter((product) =>
          [product.name, product.category, product.description].some((field) => field.toLowerCase().includes(q.toLowerCase())),
        )
      : liveProducts
    if (space !== 'all') list = list.filter((product) => product.space === space)
    if (type !== 'all') list = list.filter((product) => product.category === type)
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [space, type, sort, q, liveProducts])

  return (
    <main id="main" className="page-wrap">
      <div className="page-hero">
        <h1>The Collection</h1>
        <p className="form-note">
          {q ? `Search results for “${q}”` : 'A curated edit of sofas, seating, tables and quiet companions for the home.'}
        </p>
      </div>
      <div className="shop-toolbar">
        <div className="filters">
          {spaces.map((item) => (
            <button
              key={item.id}
              type="button"
              className={space === item.id || (item.id === 'all' && !params.get('space')) ? 'chip is-on' : 'chip'}
              onClick={() => {
                const next = new URLSearchParams(params)
                if (item.id === 'all') next.delete('space')
                else next.set('space', item.id)
                setParams(next)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filters">
          <button
            type="button"
            className={type === 'all' ? 'chip is-on' : 'chip'}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('type')
              setParams(next)
            }}
          >
            All types
          </button>
          {types.map((item) => (
            <button
              key={item}
              type="button"
              className={type === item ? 'chip is-on' : 'chip'}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('type', item)
                setParams(next)
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <label>
          Sort
          <select
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              next.set('sort', e.target.value)
              setParams(next)
            }}
            aria-label="Sort products"
            style={{ marginLeft: 8, width: 'auto' }}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
            {/* BESPOKE CUSTOM FURNITURE ENTRY POINT */}
      <div style={{
        margin: '24px 0', padding: '24px 28px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(253,251,247,0.95), rgba(245,240,235,0.95))',
        border: '1px solid rgba(131,80,34,0.18)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#835022', textTransform: 'uppercase' }}>
            Atelier Commissions
          </div>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 600, color: '#1c1917', margin: '4px 0 6px' }}>
            Need Bespoke Dimensions or Unique Upholstery?
          </h2>
          <p style={{ color: '#78716c', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Every home is singular. Connect directly with our master craftsmen on WhatsApp to commission a custom-made sofa, lounge chair, or dining piece tailored to your architectural blueprints.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setCustomModalOpen(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            Custom Commission Form
          </button>
          <a
            href={getWhatsAppUrl(
              COUCHKRAFT_WHATSAPP_PHONE,
              buildCustomFurnitureWhatsAppMessage({
                productName: 'Custom Silhouette / Architectural Commission',
                productUrl: typeof window !== 'undefined' ? `${window.location.origin}/shop` : 'https://couchkraft.in/shop',
              })
            )}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '12px 20px', borderRadius: 8, background: '#38312b', color: '#fff',
              fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(41,36,31,0.12)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>💬</span> Direct WhatsApp Chat
          </a>
        </div>
      </div>

      <CustomRequestModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
      />

      <ProductGrid items={items} />
      <div style={{ height: 64 }} />
    </main>
  )
}
