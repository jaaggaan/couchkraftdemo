import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAdmin } from '../App'
import type { ReactNode } from 'react'

const nav = [
  { section: 'OVERVIEW', items: [{ label: 'Dashboard', icon: 'space_dashboard', path: '/' }] },
  { section: 'CATALOG & INVENTORY', items: [
    { label: 'Products', icon: 'chair', path: '/products' },
    { label: 'Categories', icon: 'account_tree', path: '/categories' },
    { label: 'Inventory', icon: 'warehouse', path: '/inventory' },
    { label: 'Custom Requests', icon: 'draw', path: '/custom-requests' },
  ]},
  { section: 'MARKETING', items: [
    { label: 'Offers & Coupons', icon: 'loyalty', path: '/coupons' },
    { label: 'Promotional Banners', icon: 'ad_units', path: '/banners' },
  ]},
  { section: 'FULFILLMENT', items: [
    { label: 'Orders', icon: 'local_shipping', path: '/orders' },
    { label: 'Customers', icon: 'group', path: '/customers' },
    { label: 'Store Settings', icon: 'settings', path: '/settings' },
  ]},
]

function getBreadcrumb(pathname: string) {
  if (pathname === '/') return 'Dashboard'
  const flat = nav.flatMap(s => s.items)
  const match = flat.find(i => pathname.startsWith(i.path) && i.path !== '/')
  return match?.label || pathname.slice(1)
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin, signOut } = useAdmin()
  const location = useLocation()
  const crumb = getBreadcrumb(location.pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="admin-shell">
      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div style={{ padding: '20px 20px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 18 }}>C</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 15, color: 'var(--primary)', letterSpacing: '-0.01em' }}>COUCHKRAFT</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ADMIN PORTAL</div>
            </div>
          </div>
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            style={{ width: 32, height: 32 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
          {nav.map(section => (
            <div key={section.section} style={{ marginBottom: 16 }}>
              <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{section.section}</div>
              {section.items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'} style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 8,
                  fontSize: 13, fontWeight: isActive ? 700 : 600, letterSpacing: '0.01em',
                  color: isActive ? 'var(--on-primary-fixed)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-fixed)' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  marginBottom: 2,
                })}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flexShrink: 0, padding: 8, background: 'rgba(245,240,235,0.6)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 6, borderRadius: 8, background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {admin?.avatarUrl ? (
                <img src={admin.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {admin?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.name}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Store Owner</div>
              </div>
            </div>
            <button onClick={signOut} title="Sign Out" style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="admin-main">
        {/* TOP HEADER */}
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle navigation drawer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span className="admin-header-crumb-prefix" style={{ cursor: 'pointer' }}>CouchKraft Admin</span>
              <span className="material-symbols-outlined admin-header-crumb-prefix" style={{ fontSize: 16 }}>chevron_right</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{crumb}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <a href="/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span className="hide-on-mobile">View Storefront</span> <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            </a>
            <div style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--surface-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>₹ INR</div>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  )
}
