import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

type CustomRequest = {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  productId?: string
  productName?: string
  productUrl?: string
  seatingCapacity?: string
  dimensions?: { width?: any; depth?: any; height?: any; unit?: string }
  material?: string
  fabric?: string
  color?: string
  budget?: string
  notes?: string
  status: 'new' | 'under_review' | 'quoted' | 'approved' | 'archived'
  adminNotes?: string
  createdAt: string
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: '#e0f2fe', color: '#0369a1' },
  under_review: { bg: '#fef3c7', color: '#92400e' },
  quoted: { bg: '#f3e8ff', color: '#6b21a8' },
  approved: { bg: '#dcfce7', color: '#166534' },
  archived: { bg: '#f3f4f6', color: '#4b5563' },
}

export function CustomRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedReq, setSelectedReq] = useState<CustomRequest | null>(null)
  const [updating, setUpdating] = useState(false)
  const [adminNoteText, setAdminNoteText] = useState('')

  const fetchRequests = () => {
    setLoading(true)
    adminApi.getCustomRequests().then((d) => {
      setRequests(d.requests || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleUpdateStatus = async (id: string, nextStatus: any) => {
    setUpdating(true)
    try {
      await adminApi.updateCustomRequest(id, { status: nextStatus, adminNotes: adminNoteText })
      setRequests((list) => list.map((r) => (r.id === id ? { ...r, status: nextStatus, adminNotes: adminNoteText } : r)))
      if (selectedReq?.id === id) {
        setSelectedReq((prev) => (prev ? { ...prev, status: nextStatus, adminNotes: adminNoteText } : null))
      }
    } finally {
      setUpdating(false)
    }
  }

  const filtered = requests.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>Bespoke Atelier</div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>Custom Furniture Commissions</h1>
        </div>
        <button
          onClick={fetchRequests}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fff', fontSize: 13, fontWeight: 600,
            color: 'var(--text-secondary)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* FILTER CHIPS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'new', 'under_review', 'quoted', 'approved', 'archived'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--primary)' : '#fff',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textTransform: 'capitalize',
            }}
          >
            {f.replace('_', ' ')} ({f === 'all' ? requests.length : requests.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading bespoke enquiries...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--text-muted)', marginBottom: 12 }}>draw</span>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>No enquiries found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Custom furniture enquiries submitted via storefront WhatsApp modals will appear here.</p>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-cream)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Enquiry Ref</th>
                <th style={{ padding: '14px 16px' }}>Client</th>
                <th style={{ padding: '14px 16px' }}>Piece Reference</th>
                <th style={{ padding: '14px 16px' }}>Specifications</th>
                <th style={{ padding: '14px 16px' }}>Target Budget</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = statusColors[r.status] || { bg: '#f3f4f6', color: '#4b5563' }
                const cleanPhone = r.customerPhone.replace(/[^0-9]/g, '')
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => { setSelectedReq(r); setAdminNoteText(r.adminNotes || '') }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--primary)' }}>{r.id}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.customerName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.customerPhone}</div>
                      {r.customerEmail && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.customerEmail}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{r.productName || 'Bespoke Custom Furniture'}</div>
                      {r.seatingCapacity && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.seatingCapacity}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                      {r.dimensions?.width && (
                        <div style={{ fontSize: 12 }}>
                          {r.dimensions.width}×{r.dimensions.depth}×{r.dimensions.height} {r.dimensions.unit || 'cm'}
                        </div>
                      )}
                      {(r.material || r.fabric) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {[r.material, r.fabric, r.color].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.budget || 'Undisclosed'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${r.customerName}! Thank you for enquiring with CouchKraft regarding your bespoke commission (${r.productName || 'Custom Furniture'}). Our atelier has reviewed your dimensions.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open WhatsApp Chat with Client"
                          style={{
                            padding: '6px 10px', borderRadius: 6, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600,
                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                          WhatsApp
                        </a>
                        <button
                          onClick={() => { setSelectedReq(r); setAdminNoteText(r.adminNotes || '') }}
                          style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'var(--surface-cream)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAILS DRAWER */}
      {selectedReq && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)',
        }} onClick={() => setSelectedReq(null)}>
          <div style={{
            width: '100%', maxWidth: 500, height: '100%', background: '#fff', overflowY: 'auto',
            padding: 28, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>Bespoke Commission Detail</div>
                <h2 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 600, margin: '2px 0 0' }}>{selectedReq.id}</h2>
              </div>
              <button onClick={() => setSelectedReq(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* STATUS SELECTOR */}
              <div style={{ background: 'var(--surface-cream)', padding: 14, borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Enquiry Status
                </label>
                <select
                  value={selectedReq.status}
                  onChange={(e) => handleUpdateStatus(selectedReq.id, e.target.value)}
                  disabled={updating}
                  style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="new">New Enquiry</option>
                  <option value="under_review">Under Atelier Review</option>
                  <option value="quoted">Quoted to Client</option>
                  <option value="approved">Approved &amp; Commissioned</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* CLIENT DETAILS */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Client Information</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedReq.customerName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Phone: <strong>{selectedReq.customerPhone}</strong></div>
                {selectedReq.customerEmail && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email: {selectedReq.customerEmail}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Submitted: {new Date(selectedReq.createdAt).toLocaleString()}</div>
              </div>

              {/* PRODUCT REF */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Piece Reference</div>
                <div style={{ fontWeight: 600 }}>{selectedReq.productName || 'Bespoke Custom Silhouette'}</div>
                {selectedReq.productUrl && (
                  <a href={selectedReq.productUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'underline' }}>
                    View Storefront Product Page
                  </a>
                )}
              </div>

              {/* SPECS */}
              <div style={{ background: 'var(--surface-cream)', padding: 14, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Requested Specifications</div>
                {selectedReq.seatingCapacity && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Seating:</strong> {selectedReq.seatingCapacity}</div>}
                {selectedReq.dimensions?.width && (
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>Dimensions:</strong> {selectedReq.dimensions.width} W × {selectedReq.dimensions.depth} D × {selectedReq.dimensions.height} H ({selectedReq.dimensions.unit || 'cm'})
                  </div>
                )}
                {selectedReq.material && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Structure:</strong> {selectedReq.material}</div>}
                {selectedReq.fabric && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Fabric:</strong> {selectedReq.fabric}</div>}
                {selectedReq.color && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Color Palette:</strong> {selectedReq.color}</div>}
                {selectedReq.budget && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Target Budget:</strong> {selectedReq.budget}</div>}
                {selectedReq.notes && (
                  <div style={{ fontSize: 13, marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, fontStyle: 'italic' }}>
                    "{selectedReq.notes}"
                  </div>
                )}
              </div>

              {/* ADMIN NOTES */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Internal Atelier Notes
                </label>
                <textarea
                  value={adminNoteText}
                  onChange={(e) => setAdminNoteText(e.target.value)}
                  placeholder="Record quote amounts, fabric swatch dispatch date, carpenter notes..."
                  rows={4}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: 13, resize: 'none', outline: 'none' }}
                />
                <button
                  onClick={() => handleUpdateStatus(selectedReq.id, selectedReq.status)}
                  disabled={updating}
                  style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {updating ? 'Saving Note...' : 'Save Internal Note'}
                </button>
              </div>

              {/* DIRECT WHATSAPP ACTION */}
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <a
                  href={`https://wa.me/${selectedReq.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedReq.customerName}! This is the CouchKraft atelier following up on your custom commission for ${selectedReq.productName || 'Bespoke Furniture'}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8,
                    background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  }}
                >
                  <span className="material-symbols-outlined">chat</span>
                  Connect on WhatsApp with Client
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
