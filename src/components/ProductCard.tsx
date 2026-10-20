import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../data/products'
import { useStore } from '../context/StoreContext'
import { formatPrice } from '../utils/format'
import { HeartIcon } from './Icons'

type ProductCardProps = {
  product: Product
  showPrice?: boolean
}


function useSwipeGallery() {
  const [swipe, setSwipe] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px), (hover: none)').matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px), (hover: none)')
    const sync = () => setSwipe(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return swipe
}

export function ProductCard({ product, showPrice = true }: ProductCardProps) {
  const { toggleWishlist, isWishlisted } = useStore()
  const wished = isWishlisted(product.id)
  const images = (product.images && product.images.length > 0) ? product.images : []
  const hasMultiple = images.length > 1
  const [index, setIndex] = useState(0)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const swipe = useSwipeGallery()

  useEffect(() => {
    setIndex(0)
    sliderRef.current?.scrollTo({ left: 0 })
  }, [swipe, product.id])

  const goToIndex = (targetIndex: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!hasMultiple) return
    const clampedIndex = (targetIndex + images.length) % images.length
    setIndex(clampedIndex)
    if (sliderRef.current) {
      const width = sliderRef.current.clientWidth
      sliderRef.current.scrollTo({
        left: clampedIndex * width,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (sliderRef.current) {
        const width = sliderRef.current.clientWidth
        if (width) {
          sliderRef.current.scrollTo({ left: index * width })
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [index])

  const syncSwipeIndex = () => {
    const node = sliderRef.current
    if (!node) return
    const width = node.clientWidth
    if (!width) return
    const newIdx = Math.round(node.scrollLeft / width)
    if (newIdx !== index && newIdx >= 0 && newIdx < images.length) {
      setIndex(newIdx)
    }
  }

  return (
    <article className="product-card">
      <figure>
        {swipe ? (
          <div className="product-slider is-swipe" ref={sliderRef} onScroll={syncSwipeIndex}>
            {images.map((src, imageIndex) => (
              <Link
                key={`${src}-${imageIndex}`}
                to={`/product/${product.slug}`}
                className="product-slide"
                aria-label={imageIndex === 0 ? product.name : `${product.name}, view ${imageIndex + 1}`}
              >
                <img
                  src={src}
                  alt={imageIndex === 0 ? product.name : `${product.name}, view ${imageIndex + 1}`}
                  width={640}
                  height={600}
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        ) : (
          <Link to={`/product/${product.slug}`} className="product-slider-link" aria-label={product.name}>
            <div className="product-slider" style={{ transform: `translateX(-${index * 100}%)` }}>
              {images.map((src, imageIndex) => (
                <img
                  key={`${src}-${imageIndex}`}
                  src={src}
                  alt={imageIndex === 0 ? product.name : `${product.name}, view ${imageIndex + 1}`}
                  width={640}
                  height={600}
                  loading="lazy"
                />
              ))}
            </div>
          </Link>
        )}

        {hasMultiple && (
          <div className="slide-dots" role="tablist" aria-label={`Images for ${product.name}`}>
            {images.map((src, imageIndex) => {
              const active = imageIndex === index
              return (
                <button
                  key={`${src}-${imageIndex}`}
                  type="button"
                  role="tab"
                  className={`slide-dot${active ? ' is-on' : ''}`}
                  aria-label={`View image ${imageIndex + 1} of ${images.length}`}
                  aria-selected={active}
                  onClick={(e) => goToIndex(imageIndex, e)}
                />
              )
            })}
          </div>
        )}

        <button
          type="button"
          className={wished ? 'wish is-on' : 'wish'}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wished}
          onClick={() => toggleWishlist(product.id)}
        >
          <HeartIcon filled={wished} />
        </button>
      </figure>

      <div className="product-meta">
        <Link to={`/product/${product.slug}`}>{product.name}</Link>
        {showPrice ? (
          <span>
            {product.compareAt ? <span className="price-was">{formatPrice(product.compareAt)}</span> : null}
            <strong>{formatPrice(product.price)}</strong>
          </span>
        ) : null}
        {!product.madeToOrder && (product.readyToShipStock ?? 1) <= 0 ? (
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, display: 'block', marginTop: 3 }}>Out of stock</span>
        ) : !product.madeToOrder && (product.readyToShipStock ?? 10) <= (product.lowStockThreshold ?? 2) ? (
          <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600, display: 'block', marginTop: 3 }}>Only {product.readyToShipStock} left</span>
        ) : null}
      </div>
    </article>
  )
}

export function ProductGrid({ items, showPrice = true }: { items: Product[]; showPrice?: boolean }) {
  if (!items.length) {
    return <p className="form-note">No pieces match this view. Try another filter or search.</p>
  }

  return (
    <div className="product-grid">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} showPrice={showPrice} />
      ))}
    </div>
  )
}
