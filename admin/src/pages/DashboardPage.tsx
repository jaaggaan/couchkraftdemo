import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { useAdmin } from '../App'
import { useNavigate } from 'react-router-dom'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function StatCard({ icon, label, value, color, sub }: { icon: string; label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

export function DashboardPage() {
  const { admin } = useAdmin()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [err, setErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = useCallback(() => {
    setRefreshing(true)
    return adminApi
      .dashboardStats()
      .then((data) => {
        setStats(data)
        setErr('')
      })
      .catch((e) => setErr(e.message))
      .finally(() => setRefreshing(false))
  }, [])

  useEffect(() => {
    void loadStats()
    const onFocus = () => void loadStats()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadStats()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadStats])

  if (err) return <div style={{ padding: 40, color: 'var(--error)' }}>{err}</div>
  if (!stats) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading dashboard...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Welcome back, {admin?.name?.split(' ')[0]}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Here's what's happening with your store today.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8,
              border: '1px solid var(--border-subtle)', background: '#fff', color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <button onClick={() => navigate('/products/new')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(131,80,34,0.25)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New Product
          </button>
        </div>
      </div>

      {/* STAT CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon="point_of_sale" label="Today's Sales" value={fmt(stats.todaySales)} color="var(--primary)" sub={`${stats.todayOrdersCount} orders today`} />
        <StatCard icon="trending_up" label="Monthly Sales" value={fmt(stats.monthlySales)} color="var(--secondary)" />
        <StatCard icon="shopping_bag" label="Total Orders" value={String(stats.totalOrders)} color="var(--primary)" sub={`${stats.pendingOrders} pending`} />
        <StatCard icon="local_shipping" label="Delivered" value={String(stats.deliveredOrders)} color="var(--secondary)" />
        <StatCard icon="group" label="Customers" value={String(stats.customerCount)} color="var(--tertiary)" />
        <StatCard icon="inventory_2" label="Products" value={String(stats.totalProducts)} color="var(--primary)" />
        <StatCard
          icon="warning"
          label="Low Stock"
          value={String(stats.lowStockCount)}
          color="var(--error)"
          sub="Ready-to-ship only · Admin → Inventory"
        />
        <StatCard icon="handyman" label="Enquiries" value={String(stats.pendingEnquiriesCount)} color="var(--tertiary)" sub="Pending customization" />
        <StatCard
          icon="payments"
          label="Approved · pay due"
          value={String(stats.approvedAwaitingPaymentCount ?? 0)}
          color="var(--primary)"
          sub="Customer can pay commission"
        />
      </div>

      {(stats.recentApprovedCommissions || []).length > 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 32, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>Approved commissions</h2>
            <button type="button" onClick={() => navigate('/custom-requests')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}>
              Manage →
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Ref', 'Client', 'Piece', 'Quote', 'Payment'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats.recentApprovedCommissions || []).map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--primary)' }}>{r.id}</td>
                  <td style={{ padding: '10px' }}>{r.customerName}</td>
                  <td style={{ padding: '10px' }}>{r.productName || 'Bespoke'}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{r.quoteAmount ? fmt(Number(r.quoteAmount)) : '—'}</td>
                  <td style={{ padding: '10px', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: r.paymentStatus === 'paid' ? '#166534' : '#92400e' }}>
                    {r.paymentStatus === 'paid' ? 'Paid' : r.paymentStatus === 'awaiting' ? 'Awaiting' : 'Due'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* RECENT ORDERS TABLE */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflowX: 'auto' }} className="table-responsive">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>Recent Orders</h2>
          <button onClick={() => navigate('/orders')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}>View All →</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Order #', 'Date', 'Items', 'Total', 'Payment', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(stats.recentOrders || []).map((o: any) => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px' }}><span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 13 }}>{o.number}</span></td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                <td style={{ padding: '10px' }}>{o.items?.length || 0} items</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>{fmt(o.total)}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    background: o.paymentStatus === 'paid' ? 'var(--status-active)' : 'var(--status-warning)',
                    color: o.paymentStatus === 'paid' ? 'var(--secondary)' : 'var(--tertiary)',
                    textTransform: 'uppercase',
                  }}>{o.paymentStatus}</span>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    background: 'var(--surface-muted)', color: 'var(--text-secondary)',
                    textTransform: 'capitalize',
                  }}>{o.fulfilmentStatus?.replace(/_/g, ' ')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
