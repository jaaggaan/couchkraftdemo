import { useEffect, useState, type CSSProperties } from 'react'
import { adminApi } from '../lib/api'

export function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showPersonal, setShowPersonal] = useState(false)
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, minOrderValue: 0, description: '', active: true })
  const [personal, setPersonal] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    value: 12,
    type: 'percent',
    minOrderValue: 15000,
    description: '',
  })

  const reload = () => {
    adminApi.getCoupons().then((d) => setCoupons(d.coupons)).catch(() => {})
  }

  useEffect(() => {
    reload()
  }, [])

  const handleAdd = async () => {
    if (!form.code.trim()) return
    const { coupon } = (await adminApi.createCoupon(form)) as any
    setCoupons((cs) => [coupon, ...cs])
    setShowAdd(false)
    setForm({ code: '', type: 'percent', value: 10, minOrderValue: 0, description: '', active: true })
  }

  const handlePersonal = async () => {
    if (!personal.customerId.trim() || !personal.customerEmail.trim()) return
    const res = (await adminApi.createPersonalCoupon({
      customerId: personal.customerId.trim(),
      customerName: personal.customerName.trim() || 'Customer',
      customerEmail: personal.customerEmail.trim(),
      value: personal.value,
      type: personal.type,
      minOrderValue: personal.minOrderValue,
      description: personal.description,
    })) as any
    if (res.coupon) {
      setCoupons((cs) => [res.coupon, ...cs])
      setShowPersonal(false)
      setPersonal({
        customerId: '',
        customerName: '',
        customerEmail: '',
        value: 12,
        type: 'percent',
        minOrderValue: 15000,
        description: '',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await adminApi.deleteCoupon(id)
    setCoupons((cs) => cs.filter((c) => c.id !== id))
  }

  const toggleActive = async (c: any) => {
    const { coupon } = (await adminApi.updateCoupon(c.id, { active: !c.active })) as any
    setCoupons((cs) => cs.map((x) => (x.id === c.id ? coupon : x)))
  }

  const publicCoupons = coupons.filter((c) => !c.personal)
  const personalCoupons = coupons.filter((c) => c.personal)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Offers &amp; Coupons</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowPersonal(!showPersonal)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Issue personal coupon
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Create Coupon
          </button>
        </div>
      </div>

      {showPersonal && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Personal coupon for a customer</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Copy customer ID from Customers. Track each personal coupon as <strong>Used</strong> or <strong>Unused</strong> below.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input placeholder="Customer ID" value={personal.customerId} onChange={(e) => setPersonal((p) => ({ ...p, customerId: e.target.value }))} style={fieldStyle} />
            <input placeholder="Customer name" value={personal.customerName} onChange={(e) => setPersonal((p) => ({ ...p, customerName: e.target.value }))} style={fieldStyle} />
            <input placeholder="Customer email" value={personal.customerEmail} onChange={(e) => setPersonal((p) => ({ ...p, customerEmail: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
            <input type="number" placeholder="Value %" value={personal.value} onChange={(e) => setPersonal((p) => ({ ...p, value: +e.target.value }))} style={{ ...fieldStyle, width: 100 }} />
            <input placeholder="Description" value={personal.description} onChange={(e) => setPersonal((p) => ({ ...p, description: e.target.value }))} style={{ ...fieldStyle, flex: 1 }} />
            <button type="button" onClick={handlePersonal} style={primaryBtn}>Issue coupon</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Code</label>
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="WARM10" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={fieldStyle}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value</label>
              <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: +e.target.value }))} style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={fieldStyle} />
            </div>
            <button type="button" onClick={handleAdd} style={primaryBtn}>
              Create
            </button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Personal coupons</h2>
      <CouponGrid coupons={personalCoupons} onDelete={handleDelete} onToggle={toggleActive} showCustomer />
      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>Public coupons</h2>
      <CouponGrid coupons={publicCoupons} onDelete={handleDelete} onToggle={toggleActive} />
    </div>
  )
}

const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const fieldStyle: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 14px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--surface-cream)',
  fontSize: 14,
  outline: 'none',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
}
const primaryBtn: CSSProperties = {
  height: 40,
  padding: '0 20px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--secondary)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function CouponGrid({
  coupons,
  onDelete,
  onToggle,
  showCustomer,
}: {
  coupons: any[]
  onDelete: (id: string) => void
  onToggle: (c: any) => void
  showCustomer?: boolean
}) {
  if (!coupons.length) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No coupons in this section.</p>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
      {coupons.map((c) => (
        <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em' }}>{c.code}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => onToggle(c)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: c.active ? 'var(--secondary)' : 'var(--text-muted)' }}>{c.active ? 'toggle_on' : 'toggle_off'}</span>
              </button>
              <button type="button" onClick={() => onDelete(c.id)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>delete</span>
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{c.description}</p>
          {showCustomer && (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              {c.customerName || 'Customer'} · {c.customerEmail || c.customerId}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
            {c.personal ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: c.redeemed ? '#fee2e2' : '#dcfce7',
                  fontWeight: 700,
                  color: c.redeemed ? '#b91c1c' : '#15803d',
                }}
              >
                {c.redeemed ? 'Used' : 'Unused'}
              </span>
            ) : (
              <span>
                Used: {c.usedCount || 0}
                {c.usageLimit ? `/${c.usageLimit}` : ''}
              </span>
            )}
            <span style={{ padding: '2px 8px', borderRadius: 4, background: c.active ? 'var(--status-active)' : 'var(--surface-muted)', fontWeight: 700, color: c.active ? 'var(--secondary)' : 'var(--text-muted)' }}>{c.active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}