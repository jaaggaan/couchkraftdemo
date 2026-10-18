import { useMemo, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { Link } from 'react-router-dom'
import { collectionTabs, type CollectionTab } from '../data/products'
import { lifestyle, spaces } from '../data/site'
import { ProductGrid } from '../components/ProductCard'
import { ArrowIcon } from '../components/Icons'
import { HeroSlider } from '../components/HeroSlider'

export function HomePage() {
  const [tab, setTab] = useState<CollectionTab>('bestsellers')
  const { products: liveProducts } = useStore()
  const items = useMemo(() => liveProducts.filter((product) => product.tabs.includes(tab)).slice(0, 6), [tab, liveProducts])
  const overlayProduct = liveProducts.find((product) => product.slug === 'theo-oak-chair') ?? liveProducts[0]
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  return (
    <main id="main">
      <HeroSlider />

      <section className="section page-wrap">
        <div className="section-heading">
          <h2>Our Signature Pieces</h2>
        </div>
        <div className="tabs" role="tablist" aria-label="Collection">
          {collectionTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'tab is-active' : 'tab'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ProductGrid items={items} showPrice={false} />
      </section>

      <section className="section page-wrap lifestyle">
        <div className="lifestyle-photo">
          <img src={lifestyle.kitchen} alt="A warm oak kitchen and dining room with natural daylight" width={1600} height={1100} />
          <Link to={`/product/${overlayProduct.slug}`} className="float-card">
            <img src={overlayProduct.images[0]} alt={overlayProduct.name} />
            <p>
              <span>{overlayProduct.name}</span>
              <span>Explore</span>
            </p>
          </Link>
        </div>
        <div className="lifestyle-copy">
          <h2>Designed for the way you live</h2>
          <p>Thoughtfully chosen furniture that brings lasting comfort and character to everyday spaces.</p>
          <Link className="btn" to="/shop">
            Explore the Collection
          </Link>
        </div>
      </section>

      <section className="section page-wrap">
        <div className="section-heading">
          <h2>Explore by Space or Style</h2>
        </div>
        <div className="space-grid">
          {spaces.map((space) => (
            <Link key={space.id} to={space.href} className="space-tile">
              <img src={space.image} alt="" width={800} height={600} loading="lazy" />
              <span>
                {space.label} <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section page-wrap brand-story">
        <p className="form-note">Our story</p>
        <h2>Every stitch. Every spring. Yours.</h2>
        <p>
          Each CouchKraft sofa is built by artisans who have spent decades perfecting comfort. We use kiln-dried
          hardwood, 8-way hand-tied springs and high-resilience foam — because shortcuts have no place in your living
          room.
        </p>
        <Link to="/about">Discover our story</Link>
      </section>

      <section className="section page-wrap newsletter">
        <div className="newsletter-photo">
          <img src={lifestyle.living} alt="A composed living room with a cream sofa and oak sideboard" width={1400} height={900} loading="lazy" />
        </div>
        <div>
          <h2>Bring a little more comfort home.</h2>
          <p>Join our list for new collections, thoughtful interiors and occasional special offers.</p>
          <form
            className="newsletter-form"
            onSubmit={(e) => {
              e.preventDefault()
              const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              if (!valid) {
                setNote('Please enter a valid email address.')
                return
              }
              setNote('Thank you. This list is local only — nothing was stored on a server.')
              setEmail('')
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              required
            />
            <button className="btn" type="submit">
              Subscribe
            </button>
          </form>
          {note ? <p className={`form-note${note.startsWith('Please') ? ' is-error' : ''}`}>{note}</p> : null}
        </div>
      </section>
    </main>
  )
}
