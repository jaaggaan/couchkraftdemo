
function BagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CommissionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.13 7.68C8.95 7.68 8.66 7.75 8.41 8.02C8.16 8.29 7.45 8.95 7.45 10.3C7.45 11.65 8.43 12.95 8.57 13.14C8.71 13.33 10.5 16.08 13.23 17.26C13.88 17.54 14.39 17.71 14.78 17.84C15.44 18.05 16.04 18.02 16.51 17.95C17.04 17.87 18.13 17.29 18.36 16.64C18.59 15.99 18.59 15.44 18.52 15.32C18.45 15.21 18.26 15.14 17.99 15C17.71 14.86 16.35 14.19 16.1 14.1C15.85 14.01 15.67 13.96 15.48 14.24C15.3 14.51 14.78 15.14 14.62 15.32C14.46 15.51 14.3 15.53 14.02 15.4C13.75 15.26 12.87 14.97 11.83 14.04C11.02 13.32 10.47 12.43 10.31 12.15C10.15 11.88 10.29 11.73 10.43 11.59C10.56 11.46 10.72 11.25 10.86 11.09C11 10.93 11.05 10.81 11.14 10.63C11.23 10.45 11.19 10.29 11.12 10.15C11.05 10.01 10.5 8.67 10.27 8.12C10.05 7.59 9.82 7.66 9.66 7.65C9.51 7.65 9.33 7.68 9.13 7.68Z" />
</svg>
  )
}

import { buildCustomFurnitureWhatsAppMessage, getWhatsAppUrl, COUCHKRAFT_WHATSAPP_PHONE } from '../utils/whatsapp'
import { ProductCustomizer } from '../components/ProductCustomizer'
import { CustomRequestModal } from '../components/CustomRequestModal'
import type { SelectedCustomization } from '../data/products'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductBySlug } from '../data/products'
import { useStore } from '../context/StoreContext'
import { formatPrice } from '../utils/format'
import { ProductGrid } from '../components/ProductCard'

export function ProductPage() {
  const { slug = '' } = useParams()
  const { products: liveProducts, addToCart, toggleWishlist, isWishlisted } = useStore()
  const product = liveProducts.find((p) => p.slug === slug) || getProductBySlug(slug)
  const [finish, setFinish] = useState(product?.finishes[0] ?? '')
  const [qty, setQty] = useState(1)
  const [image, setImage] = useState(0)
  const [note, setNote] = useState('')
  const [customRequestOpen, setCustomRequestOpen] = useState(false)
  const [selectedCustomization, setSelectedCustomization] = useState<SelectedCustomization | null>(null)
  const [configuredPrice, setConfiguredPrice] = useState<number>(product?.price || 0)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setFinish(product?.finishes[0] ?? '')
    setQty(1)
    setImage(0)
    setNote('')
    setSelectedCustomization(null)
    setConfiguredPrice(product?.price || 0)
  }, [product, slug])

  if (!product) {
    return (
      <main id="main" className="page-wrap page-hero">
        <h1>Piece not found</h1>
        <p>
          <Link to="/shop">Return to the collection</Link>
        </p>
      </main>
    )
  }

  const related = product
    ? liveProducts.filter((item) => item.id !== product.id && (item.space === product.space || item.category === product.category)).slice(0, 3)
    : []

  return (
    <main id="main" className="page-wrap">
      <article className="pdp">
        <div className="gallery">
          <div className="gallery-main">
            <img src={product.images[image] ?? product.images[0]} alt={product.name} width={900} height={900} />
          </div>
          <div className="thumbs">
            {product.images.map((src, index) => (
              <button key={src} type="button" onClick={() => setImage(index)} aria-label={`View image ${index + 1}`}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="pdp-info">
          <h1>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '8px 0 16px' }}>
            <p className="pdp-price" style={{ margin: 0 }}>
              {product.compareAt ? <span className="price-was">{formatPrice(product.compareAt)}</span> : null}
              {formatPrice(configuredPrice > 0 ? configuredPrice : product.price)}
            </p>
            {product.madeToOrder ? (
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(131,80,34,0.1)', color: '#835022' }}>
                Made to Order · {product.leadTimeWeeks || 3} weeks lead time
              </span>
            ) : (product.readyToShipStock ?? 1) <= 0 ? (
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
                Out of Stock
              </span>
            ) : (product.readyToShipStock ?? 10) <= (product.lowStockThreshold ?? 2) ? (
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                Low Stock · Only {product.readyToShipStock} units left
              </span>
            ) : (
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
                In Stock · Ready to ship
              </span>
            )}
          </div>
                    <p>{product.description}</p>

          {/* CUSTOMIZE THIS PRODUCT SECTION */}
          {Boolean(product.customizationEnabled && (product.customizationOptions?.enabled ?? true)) && (
            <ProductCustomizer
              product={product}
              onChange={(custom, price) => {
                setSelectedCustomization(custom)
                setConfiguredPrice(price)
              }}
            />
          )}
          <div className="field">
            <label htmlFor="finish">Finish</label>
            <select id="finish" value={finish} onChange={(e) => setFinish(e.target.value)}>
              {product.finishes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quantity</label>
            <div className="qty">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease quantity">
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((n) => n + 1)} aria-label="Increase quantity">
                +
              </button>
            </div>
          </div>
          {/* UNIFIED PREMIUM PDP ACTIONS SUITE */}
          <div className="pdp-action-group">
            {/* Primary Action Row: Add to Bag + Save */}
            <div className="pdp-primary-row">
              <button
                type="button"
                className="pdp-btn pdp-btn-primary"
                disabled={!product.madeToOrder && (product.readyToShipStock ?? 1) <= 0}
                onClick={() => {
                  addToCart(product.id, qty, finish, selectedCustomization || undefined)
                  setNote('Added to bag.')
                }}
              >
                <BagIcon />
                <span>{!product.madeToOrder && (product.readyToShipStock ?? 1) <= 0 ? 'Out of Stock' : 'Add to Bag'}</span>
              </button>

              <button
                type="button"
                className={`pdp-btn pdp-btn-save ${isWishlisted(product.id) ? 'is-saved' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Save piece to wishlist'}
              >
                <HeartIcon filled={isWishlisted(product.id)} />
                <span>{isWishlisted(product.id) ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Atelier & Concierge Actions: Custom-Made Commission + Chat on WhatsApp */}
            <div className="pdp-secondary-row">
              <button
                type="button"
                className="pdp-btn pdp-btn-commission"
                onClick={() => setCustomRequestOpen(true)}
              >
                <CommissionIcon />
                <span>Custom Commission</span>
              </button>

              <a
                href={getWhatsAppUrl(
                  COUCHKRAFT_WHATSAPP_PHONE,
                  buildCustomFurnitureWhatsAppMessage({
                    productName: product.name,
                    productUrl: typeof window !== 'undefined' ? window.location.href : `https://couchkraft.in/product/${product.slug}`,
                    seating: selectedCustomization?.seating,
                    dimensions: selectedCustomization?.width
                      ? `${selectedCustomization.width}cm W × ${selectedCustomization.depth}cm D × ${selectedCustomization.height}cm H`
                      : `${product.dimensions ? `${product.dimensions.width}cm W × ${product.dimensions.depth}cm D × ${product.dimensions.height}cm H` : ''}`,
                    fabric: selectedCustomization?.fabric || product.finishes?.[0],
                    color: selectedCustomization?.color,
                  })
                )}
                target="_blank"
                rel="noreferrer"
                className="pdp-btn pdp-btn-whatsapp"
              >
                <WhatsAppIcon />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          <CustomRequestModal
            isOpen={customRequestOpen}
            onClose={() => setCustomRequestOpen(false)}
            product={product}
          />
          {note ? <p className="form-note">{note}</p> : null}
          <p className="form-note">{product.care}</p>
        </div>
      </article>
      <section className="section">
        <div className="section-heading">
          <h2>You may also like</h2>
        </div>
        <div style={{ height: 24 }} />
        <ProductGrid items={related} />
      </section>
    </main>
  )
}
