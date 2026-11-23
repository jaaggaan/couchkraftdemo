import { Fragment, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../lib/api'
import { DemoInvoice } from '../components/DemoInvoice'
import { buildTrackingNumber, formatOrderPlacedAt } from '../lib/tracking'

const FULFILMENT_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
]

const FULFILMENT_HINTS: Record<string, string> = {
  placed: 'Auto when order is received',
  confirmed: 'Admin confirms order',
  processing: 'Workshop / fulfilment in progress',
  shipped: 'Admin confirms dispatch',
  out_for_delivery: 'Admin confirms courier handoff',
  delivered: 'Admin confirms delivery',
}

type Section = 'orders' | 'tracking' | 'invoices'

function fmt(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [section, setSection] = useState<Section>('orders')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null)
  const [statusEdits, setStatusEdits] = useState<Record<string, { fulfilmentStatus: string }>>({})

  const loadOrders = () => {
    setLoading(true)
    adminApi
      .getOrders()
      .then((d) => {
        setOrders(d.orders || [])
        const initialEdits: Record<string, any> = {}
        ;(d.orders || []).forEach((o: any) => {
          initialEdits[o.id] = {
            fulfilmentStatus: o.fulfilmentStatus || 'placed',
          }
        })
        setStatusEdits(initialEdits)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleSaveStatus = async (orderId: string) => {
    const edits = statusEdits[orderId]
    if (!edits) return
    setSavingId(orderId)
    try {
      const res = (await adminApi.updateOrderStatus(orderId, {
        fulfilmentStatus: edits.fulfilmentStatus,
      })) as any
      if (res?.order) {
        setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, ...res.order } : o)))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = search.toLowerCase()
      const matchSearch =
        !search ||
        o.number?.toLowerCase().includes(term) ||
        o.contact?.name?.toLowerCase().includes(term) ||
        o.contact?.email?.toLowerCase().includes(term) ||
        o.contact?.phone?.includes(term)
      const matchFilter = statusFilter === 'all' || o.fulfilmentStatus === statusFilter || o.paymentStatus === statusFilter
      if (section === 'tracking') {
        return matchSearch && o.fulfilmentStatus !== 'delivered'
      }
      return matchSearch && matchFilter
    })
  }, [orders, search, statusFilter, section])

  const renderOrderRows = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
          {['Order #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Fulfillment', 'Tracking & invoice', ''].map((h) => (
            <th
              key={h}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredOrders.map((o) => {
          const isExpanded = expandedId === o.id
          const edit = statusEdits[o.id] || {
            fulfilmentStatus: o.fulfilmentStatus,
          }
          const trackingDisplay = buildTrackingNumber(o)
          const items = Array.isArray(o.items) ? o.items : []

          return (
            <Fragment key={o.id}>
              <tr
                style={{
                  borderBottom: isExpanded ? 'none' : '1px solid var(--border-subtle)',
                  background: isExpanded ? 'rgba(131,80,34,0.02)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(isExpanded ? null : o.id)}
              >
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{o.number}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                  {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{o.contact?.name || o.address?.name || 'Guest Customer'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.contact?.phone || o.address?.phone || ''}</div>
                </td>
                <td style={{ padding: '12px 14px' }}>{items.length} piece{items.length === 1 ? '' : 's'}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{fmt(o.total)}</td>
                <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: o.paymentStatus === 'paid' ? 'var(--status-active, #dcfce7)' : 'var(--status-warning, #fef3c7)',
                      color: o.paymentStatus === 'paid' ? '#15803d' : '#b45309',
                      textTransform: 'uppercase',
                    }}
                  >
                    {o.paymentStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={edit.fulfilmentStatus}
                    onChange={(e) => setStatusEdits({ ...statusEdits, [o.id]: { ...edit, fulfilmentStatus: e.target.value } })}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: '#fff',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {FULFILMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, maxWidth: 140 }}>
                    {FULFILMENT_HINTS[edit.fulfilmentStatus] || ''}
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 160 }}>
                    <code
                      title="Assigned automatically at checkout (CKTRK format)"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'var(--surface-cream)',
                        border: '1px solid var(--border-subtle)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {trackingDisplay}
                    </code>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      Placed {formatOrderPlacedAt(o.createdAt)}
                    </span>
                    <button
                      type="button"
                      disabled={savingId === o.id}
                      onClick={() => handleSaveStatus(o.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {savingId === o.id ? '...' : 'Save status'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(o)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)',
                        background: '#fff',
                        color: 'var(--primary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Generate invoice
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </td>
              </tr>

              {isExpanded && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-cream, #fcfaf7)' }}>
                  <td colSpan={9} style={{ padding: '16px 24px' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Customers see these statuses in Account → tracking feed. Only <strong>Order placed</strong> is automatic; confirm ship and delivery steps here.
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {items.map((it: any, i: number) => (
                        <li key={i}>
                          {it.name || 'Item'} × {it.quantity} — {fmt((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1))}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Orders, Tracking &amp; Invoices</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage fulfilment, tracking references, and demo invoices for customers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(
            [
              { id: 'orders' as const, label: 'Orders' },
              { id: 'tracking' as const, label: 'Tracking' },
              { id: 'invoices' as const, label: 'Invoices' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: section === tab.id ? 'var(--primary)' : '#fff',
                color: section === tab.id ? '#fff' : 'var(--text-primary)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'tracking' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <strong style={{ fontSize: 13 }}>Tracking workflow</strong>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.55 }}>
            Order received → automatic (<em>placed</em>). Update to <em>confirmed</em>, <em>shipped</em>, and <em>out for delivery</em> when ready — customers see each step in their account feed.
          </p>
        </div>
      )}

      {section === 'invoices' && (
        <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 12 }}>
          Demo invoice preview only — production GST format to be finalised later.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text-muted)' }}>
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, customer name, phone..."
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 38,
              paddingRight: 14,
              borderRadius: 8,
              border: 'none',
              background: '#fff',
              fontSize: 13,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              outline: 'none',
            }}
          />
        </div>
        {section === 'orders' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: '#fff',
              fontSize: 13,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Orders</option>
            {FULFILMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
            <option value="paid">Payment: Paid</option>
            <option value="pending">Payment: Pending</option>
          </select>
        )}
      </div>

      <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No orders match this view.</div>
        ) : (
          renderOrderRows()
        )}
      </div>

      {invoiceOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 2000,
          }}
          onClick={() => setInvoiceOrder(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DemoInvoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
          </div>
        </div>
      )}
    </div>
  )
}