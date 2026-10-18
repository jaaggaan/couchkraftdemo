import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

export function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, minOrderValue: 0, description: '', active: true })

  useEffect(() => { adminApi.getCoupons().then(d => setCoupons(d.coupons)).catch(() => {}) }, [])

  const handleAdd = async () => {
    if (!form.code.trim()) return
    const { coupon } = await adminApi.createCoupon(form) as any
    setCoupons(cs => [coupon, ...cs])
    setShowAdd(false); setForm({ code: '', type: 'percent', value: 10, minOrderValue: 0, description: '', active: true })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await adminApi.deleteCoupon(id)
    setCoupons(cs => cs.filter(c => c.id !== id))
  }

  const toggleActive = async (c: any) => {
    const { coupon } = await adminApi.updateCoupon(c.id, { active: !c.active }) as any
    setCoupons(cs => cs.map(x => x.id === c.id ? coupon : x))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Offers & Coupons</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Create Coupon
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WARM10" style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, cursor: 'pointer' }}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Value</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: +e.target.value }))} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }} />
            </div>
            <button onClick={handleAdd} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: 'var(--secondary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Create</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {coupons.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em' }}>{c.code}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => toggleActive(c)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: c.active ? 'var(--secondary)' : 'var(--text-muted)' }}>{c.active ? 'toggle_on' : 'toggle_off'}</span>
                </button>
                <button onClick={() => handleDelete(c.id)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>delete</span>
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{c.description}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Used: {c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: c.active ? 'var(--status-active)' : 'var(--surface-muted)', fontWeight: 700, color: c.active ? 'var(--secondary)' : 'var(--text-muted)' }}>{c.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
