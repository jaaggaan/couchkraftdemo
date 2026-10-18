import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

const FULFILMENT_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
]
const PAYMENT_STATUSES = ['pending', 'unpaid', 'paid', 'failed', 'refunded']

function fmt(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusEdits, setStatusEdits] = useState<Record<string, { paymentStatus: string; fulfilmentStatus: string; trackingNumber: string }>>({})

  const loadOrders = () => {
    setLoading(true)
    adminApi.getOrders().then((d) => {
      setOrders(d.orders || [])
      const initialEdits: Record<string, any> = {}
      ;(d.orders || []).forEach((o: any) => {
        initialEdits[o.id] = {
          paymentStatus: o.paymentStatus || 'pending',
          fulfilmentStatus: o.fulfilmentStatus || 'placed',
          trackingNumber: o.trackingNumber || '',
        }
      })
      setStatusEdits(initialEdits)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleSaveStatus = async (orderId: string) => {
    const edits = statusEdits[orderId]
    if (!edits) return
    setSavingId(orderId)
    try {
      const res = await adminApi.updateOrderStatus(orderId, {
        paymentStatus: edits.paymentStatus,
        fulfilmentStatus: edits.fulfilmentStatus,
        trackingNumber: edits.trackingNumber,
      }) as any
      if (res?.order) {
        setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, ...res.order } : o)))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase()
    const matchSearch =
      !search ||
      o.number?.toLowerCase().includes(term) ||
      o.contact?.name?.toLowerCase().includes(term) ||
      o.contact?.email?.toLowerCase().includes(term) ||
      o.contact?.phone?.includes(term)
    const matchFilter = statusFilter === 'all' || o.fulfilmentStatus === statusFilter || o.paymentStatus === statusFilter
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Order Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Review customer orders, update tracking numbers, and manage fulfillment lifecycles.
          </p>
        </div>
      </div>

      {/* Filters */}
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
          <option value="placed">Placed</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="paid">Payment: Paid</option>
          <option value="pending">Payment: Pending</option>
        </select>
      </div>

      {/* Orders List */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No orders match your filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                {['Order #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Fulfillment', 'Tracking #', ''].map((h) => (
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
                const edit = statusEdits[o.id] || { paymentStatus: o.paymentStatus, fulfilmentStatus: o.fulfilmentStatus, trackingNumber: o.trackingNumber || '' }
                const items = Array.isArray(o.items) ? o.items : []

                return (
                  <>
                    <tr
                      key={o.id}
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
                        <select
                          value={edit.paymentStatus}
                          onChange={(e) => setStatusEdits({ ...statusEdits, [o.id]: { ...edit, paymentStatus: e.target.value } })}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border-subtle)',
                            background: edit.paymentStatus === 'paid' ? 'var(--status-active, #dcfce7)' : 'var(--status-warning, #fef3c7)',
                            color: edit.paymentStatus === 'paid' ? '#15803d' : '#b45309',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
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
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {FULFILMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            value={edit.trackingNumber}
                            placeholder="CKTRK..."
                            onChange={(e) => setStatusEdits({ ...statusEdits, [o.id]: { ...edit, trackingNumber: e.target.value } })}
                            style={{
                              width: 110,
                              height: 28,
                              padding: '0 6px',
                              borderRadius: 4,
                              border: '1px solid var(--border-subtle)',
                              fontSize: 11,
                              outline: 'none',
                            }}
                          />
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
                            {savingId === o.id ? '...' : 'Save'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-muted)' }}>
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-cream, #fcfaf7)' }}>
                        <td colSpan={9} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                            {/* Purchased Items */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                                Purchased Line Items ({items.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {items.map((it: any, i: number) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 12,
                                      background: '#fff',
                                      padding: '8px 12px',
                                      borderRadius: 8,
                                      border: '1px solid var(--border-subtle)',
                                    }}
                                  >
                                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: '#f0eae1', flexShrink: 0 }}>
                                      <img
                                        src={it.image || '/hero-living-hd.jpg'}
                                        alt={it.name}
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/hero-living-hd.jpg' }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name || it.product_name_snapshot || 'Artisanal Furniture Piece'}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        Finish: {it.finish || it.variant_details?.finish || 'Standard'} · Qty: {it.quantity}
                                      </div>
                                      {(it.customization || it.variant_details?.customization) && (
                                        <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>
                                          Customization: {[
                                            (it.customization || it.variant_details?.customization).seating,
                                            (it.customization || it.variant_details?.customization).width ? `${(it.customization || it.variant_details?.customization).width}×${(it.customization || it.variant_details?.customization).depth}×${(it.customization || it.variant_details?.customization).height}${(it.customization || it.variant_details?.customization).dimensionUnit || 'cm'}` : null,
                                            (it.customization || it.variant_details?.customization).fabric,
                                            (it.customization || it.variant_details?.customization).color,
                                            (it.customization || it.variant_details?.customization).finish,
                                          ].filter(Boolean).join(' · ')}
                                          {(it.customization || it.variant_details?.customization).totalCustomizationDelta ? ` (+₹${Number((it.customization || it.variant_details?.customization).totalCustomizationDelta).toLocaleString('en-IN')})` : ''}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                      {fmt((Number(it.unitPrice || it.price_at_purchase) || 0) * (Number(it.quantity) || 1))}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                  <span>{fmt(o.subtotal || o.total)}</span>
                                </div>
                                {o.discount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#15803d' }}>
                                    <span>Discount ({o.coupon || 'Applied'})</span>
                                    <span>−{fmt(o.discount)}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Delivery</span>
                                  <span>Complimentary (White Glove)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: 13 }}>
                                  <span>Total Payable</span>
                                  <span>{fmt(o.total)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Delivery & Customer Info */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                                Customer & Shipping Address
                              </div>
                              <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12, lineHeight: 1.6 }}>
                                <div><strong>Name:</strong> {o.address?.name || o.contact?.name || 'Valued Customer'}</div>
                                <div><strong>Email:</strong> {o.contact?.email || 'Registered account'}</div>
                                <div><strong>Phone:</strong> {o.address?.phone || o.contact?.phone || 'Not provided'}</div>
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                  <strong>Destination:</strong>
                                  <div>{o.address?.line1 || ''} {o.address?.line2 || ''}</div>
                                  <div>{o.address?.city || ''}{o.address?.region ? `, ${o.address.region}` : ''} {o.address?.postalCode || ''}</div>
                                  <div>{o.address?.country || 'India'}</div>
                                </div>
                                {o.paymentMethod && (
                                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                                    Payment Method: <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{o.paymentMethod}</strong>
                                    {o.razorpayPaymentId && <div>Reference ID: {o.razorpayPaymentId}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
