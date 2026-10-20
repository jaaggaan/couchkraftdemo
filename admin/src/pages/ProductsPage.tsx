import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => { adminApi.getProducts().then(d => setProducts(d.products)).catch(() => {}) }, [])

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return
    await adminApi.deleteProduct(id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  const handleToggleArchive = async (p: any) => {
    const nextStatus = p.status === 'archived' ? 'published' : 'archived'
    await adminApi.updateProduct(p.id, { ...p, status: nextStatus })
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, status: nextStatus } : x))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Product Catalog</h1>
        <button onClick={() => navigate('/products/new')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none',
          background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(131,80,34,0.25)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text-muted)' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, SKUs..." style={{
            width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, borderRadius: 8, border: 'none',
            background: '#fff', fontSize: 13, color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', outline: 'none',
          }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{
          height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: '#fff', fontSize: 13,
          color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer',
        }}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
              {['', 'Product', 'SKU', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/products/${p.id}`)}>
                <td style={{ padding: '8px 14px', width: 56 }}>
                  <img src={p.images?.[0]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: 'var(--surface-container)' }} />
                </td>
                <td style={{ padding: '8px 14px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.category}</div>
                </td>
                <td style={{ padding: '8px 14px', fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 13, color: 'var(--text-muted)' }}>{p.sku}</td>
                <td style={{ padding: '8px 14px', fontWeight: 600 }}>₹{(p.price || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '8px 14px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    background: (p.readyToShipStock || 0) <= (p.lowStockThreshold || 2) ? 'var(--status-warning)' : 'var(--status-active)',
                    color: (p.readyToShipStock || 0) <= (p.lowStockThreshold || 2) ? 'var(--tertiary)' : 'var(--secondary)',
                  }}>{p.readyToShipStock ?? 0} units</span>
                </td>
                <td style={{ padding: '8px 14px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: p.status === 'published' ? 'var(--secondary-fixed)' : 'var(--surface-container-highest)',
                    color: p.status === 'published' ? 'var(--secondary)' : 'var(--text-muted)',
                  }}>{p.status}</span>
                </td>
                <td style={{ padding: '8px 14px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(p)}
                      title={p.status === 'archived' ? 'Unarchive (Publish)' : 'Archive (Hide from Store)'}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border-subtle)',
                        background: '#fff',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: p.status === 'archived' ? '#15803d' : 'var(--text-muted)',
                      }}
                    >
                      {p.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Delete" style={{
                      padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', borderRadius: 6,
                    }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No products found.</div>}
      </div>
    </div>
  )
}
