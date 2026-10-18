import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { searchProducts } from '../data/products'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { AccountMenu } from './AccountMenu'
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon } from './Icons'

const nav = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/blog', label: 'Blog' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const {
    cartCount,
    wishlist,
    getCartProducts,
    setQuantity,
    removeFromCart,
    cartTotal,
    applyCoupon,
    coupon,
    cartDiscount,
  } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const { user, openAuth, signOut } = useAuth()
  const navigate = useNavigate()
  const results = searchProducts(query).slice(0, 6)
  const lines = getCartProducts()

  useEffect(() => {
    document.body.style.overflow = menuOpen || cartOpen || searchOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen, cartOpen, searchOpen])

  return (
    <>
    <header className="site-header">
      <div className="page-wrap header-inner">
        <button type="button" className="icon-btn menu-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </button>
        <Link to="/" className="wordmark">
          CouchKraft
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-utils">
          <button type="button" className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Saved pieces" onClick={() => navigate('/wishlist')}>
            <HeartIcon filled={wishlist.length > 0} />
            {wishlist.length > 0 ? <span className="cart-count">{wishlist.length}</span> : null}
          </button>
          <AccountMenu />
          <button type="button" className="icon-btn" aria-label="Open cart" onClick={() => setCartOpen(true)}>
            <BagIcon />
            {cartCount > 0 ? <span className="cart-count">{cartCount}</span> : null}
          </button>
        </div>
      </div>
    </header>

      {menuOpen ? (
        <div className="mobile-nav" onClick={() => setMenuOpen(false)}>
          <div className="mobile-panel" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <CloseIcon />
            </button>
            <nav aria-label="Mobile">
              {nav.map((item) => (
                <p key={item.to} style={{ margin: '1rem 0' }}>
                  <Link to={item.to} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </Link>
                </p>
              ))}
              <p style={{ margin: '1rem 0' }}>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
                  Saved pieces
                </Link>
              </p>
              {user ? (
                <>
                  <p style={{ margin: '1rem 0' }}>
                    <Link to="/account" onClick={() => setMenuOpen(false)}>
                      Account
                    </Link>
                  </p>
                  <p style={{ margin: '1rem 0' }}>
                    <Link to="/account/orders" onClick={() => setMenuOpen(false)}>
                      My orders
                    </Link>
                  </p>
                  <p style={{ margin: '1rem 0' }}>
                    <button
                      type="button"
                      className="account-signout"
                      onClick={() => {
                        setMenuOpen(false)
                        void signOut().then(() => navigate('/'))
                      }}
                    >
                      Sign out
                    </button>
                  </p>
                </>
              ) : (
                <p style={{ margin: '1rem 0' }}>
                  <button
                    type="button"
                    className="account-signout"
                    onClick={() => {
                      setMenuOpen(false)
                      openAuth('signin')
                    }}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </nav>
          </div>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="search-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="search-panel" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Search</h2>
              <button type="button" className="icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <form
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault()
                setSearchOpen(false)
                navigate(`/shop?q=${encodeURIComponent(query)}`)
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sofas, chairs, tables"
                aria-label="Search products"
              />
              <button className="btn" type="submit">
                Search
              </button>
            </form>
            <div className="search-results">
              {results.map((product) => (
                <Link key={product.id} to={`/product/${product.slug}`} onClick={() => setSearchOpen(false)}>
                  <img src={product.images[0]} alt="" width={54} height={54} />
                  <span>
                    {product.name}
                    <br />
                    <small>{formatPrice(product.price)}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="drawer" role="dialog" aria-label="Cart" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Bag</h2>
              <button type="button" className="icon-btn" aria-label="Close cart" onClick={() => setCartOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            {lines.length === 0 ? (
              <div className="bag-empty">
                <p>Your bag is empty.</p>
                <p className="form-note">Add a piece from the collection, then return here to checkout.</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setCartOpen(false)
                    navigate('/shop')
                  }}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                {lines.map(({ product, quantity, finish, customization, unitPrice }: any) => (
                  <div className="cart-row" key={product.id + (finish || '') + JSON.stringify(customization || {})}>
                    <img src={product.images[0]} alt="" />
                    <div>
                      <Link to={`/product/${product.slug}`} onClick={() => setCartOpen(false)}>
                        {product.name}
                      </Link>
                      <p className="form-note">{finish}</p>
                      {customization && (
                        <p className="form-note" style={{ color: '#835022', fontSize: 11, margin: '2px 0 0' }}>
                          {[
                            customization.seating,
                            customization.width ? `${customization.width}×${customization.depth}×${customization.height}${customization.dimensionUnit || 'cm'}` : null,
                            customization.fabric,
                            customization.color,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="qty" style={{ marginTop: 8 }}>
                        <button type="button" onClick={() => setQuantity(product.id, quantity - 1)} aria-label="Decrease">
                          −
                        </button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => setQuantity(product.id, quantity + 1)} aria-label="Increase">
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong>{formatPrice((unitPrice || product.price) * quantity)}</strong>
                      <button type="button" className="link-btn" onClick={() => removeFromCart(product.id, finish, customization)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <form
                  className="coupon-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setCouponMessage(applyCoupon(couponInput).message)
                  }}
                >
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon (try WARM10)" />
                  <button className="btn" type="submit">
                    Apply
                  </button>
                </form>
                {couponMessage ? <p className="form-note">{couponMessage}</p> : null}
                <div className="totals">
                  {coupon ? (
                    <div>
                      Demonstration discount: −{formatPrice(cartDiscount)}
                    </div>
                  ) : null}
                  <strong>Total: {formatPrice(cartTotal)}</strong>
                </div>
                <p className="placeholder-note">Razorpay Test Mode checkout. No live charges are enabled.</p>
                {user ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setCartOpen(false)
                      navigate('/checkout')
                    }}
                  >
                    Checkout
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={() => openAuth('signin')}>
                    Sign in to checkout
                  </button>
                )}
              </>
            )}
          </aside>
        </div>
      ) : null}
    </>
  )
}
