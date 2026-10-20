import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

export function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const navigate = useNavigate()

  const loadData = () => {
    setLoading(true)
    adminApi.getInventory().then((d) => {
      setItems(d.inventory || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStockChange = (id: string, field: string, val: any) => {
    setItems((curr) =>
      curr.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    )
  }

  const handleSaveItem = async (item: any) => {
    setSavingId(item.id)
    setFeedback('')
    try {
      await adminApi.updateProduct(item.id, {
        readyToShipStock: Number(item.readyToShipStock) || 0,
        lowStockThreshold: Number(item.lowStockThreshold) || 2,
        madeToOrder: Boolean(item.madeToOrder),
        leadTimeWeeks: Number(item.leadTimeWeeks) || 3,
        status: item.status || 'published',
      })
      setFeedback(`Saved changes for ${item.name}!`)
      setTimeout(() => setFeedback(''), 2500)
    } catch (err: any) {
      alert(`Failed to save inventory: ${err.message}`)
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleArchive = async (item: any) => {
    const nextStatus = item.status === 'archived' ? 'published' : 'archived'
    setSavingId(item.id)
    try {
      await adminApi.updateProduct(item.id, {
        ...item,
        status: nextStatus,
      })
      setItems((curr) =>
        curr.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      )
      setFeedback(`Product ${item.name} is now ${nextStatus}.`)
      setTimeout(() => setFeedback(''), 2500)
    } catch (err: any) {
      alert(`Action failed: ${err.message}`)
    } finally {
      setSavingId(null)
    }
  }

  const filtered = items.filter((i) => {
    const matchSearch =
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false

    const stock = Number(i.readyToShipStock) || 0
    const thresh = Number(i.lowStockThreshold) || 2

    if (filter === 'in_stock') return stock > thresh
    if (filter === 'low_stock') return stock > 0 && stock <= thresh
    if (filter === 'out_of_stock') return stock <= 0 && !i.madeToOrder
    if (filter === 'made_to_order') return i.madeToOrder
    if (filter === 'archived') return i.status === 'archived'

    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Inventory & Warehouse</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Control stock allocations, low-stock alerts, made-to-order pipelines, and archiving.
          </p>
        </div>
        {feedback && (
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: 13 }}>
            {feedback}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{items.length}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase' }}>Total Catalog SKUs</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 700, color: 'var(--secondary, #15803d)' }}>
            {items.filter((i) => (Number(i.readyToShipStock) || 0) > (Number(i.lowStockThreshold) || 2)).length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase' }}>Healthy Stock</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 700, color: '#b45309' }}>
            {items.filter((i) => {
              const s = Number(i.readyToShipStock) || 0
              const t = Number(i.lowStockThreshold) || 2
              return s > 0 && s <= t
            }).length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase' }}>Low Stock Alert</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 700, color: '#835022' }}>
            {items.filter((i) => i.madeToOrder).length}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase' }}>Bespoke Made-to-Order</div>
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
            placeholder="Search piece name or SKU..."
            style={{ width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, borderRadius: 8, border: 'none', background: '#fff', fontSize: 13, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', outline: 'none' }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: '#fff', fontSize: 13, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer' }}
        >
          <option value="all">All Inventory</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="made_to_order">Made to Order</option>
          <option value="archived">Archived / Hidden</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading inventory records...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No items match your filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                {['', 'Product', 'SKU', 'Available Stock', 'Threshold', 'Availability Status', 'Made-to-Order', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const stock = Number(i.readyToShipStock) || 0
                const thresh = Number(i.lowStockThreshold) || 2
                const isOutOfStock = stock <= 0 && !i.madeToOrder
                const isLow = stock > 0 && stock <= thresh

                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i.status === 'archived' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                    <td style={{ padding: '8px 14px', width: 56 }}>
                      <img
                        src={i.image || '/hero-living-hd.jpg'}
                        alt=""
                        onError={(e) => { (e.target as HTMLImageElement).src = '/hero-living-hd.jpg' }}
                        style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', background: 'var(--surface-container)' }}
                      />
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</div>
                      {i.status === 'archived' && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase' }}>
                          Archived
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{i.sku}</td>

                    {/* Stock Input */}
                    <td style={{ padding: '8px 14px' }}>
                      <input
                        type="number"
                        min="0"
                        value={i.readyToShipStock ?? 0}
                        onChange={(e) => handleStockChange(i.id, 'readyToShipStock', +e.target.value)}
                        style={{ width: 70, height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, fontWeight: 600, outline: 'none' }}
                      />
                    </td>

                    {/* Threshold Input */}
                    <td style={{ padding: '8px 14px' }}>
                      <input
                        type="number"
                        min="0"
                        value={i.lowStockThreshold ?? 2}
                        onChange={(e) => handleStockChange(i.id, 'lowStockThreshold', +e.target.value)}
                        style={{ width: 60, height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                      />
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: '8px 14px' }}>
                      {i.status === 'archived' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                          Archived
                        </span>
                      ) : i.madeToOrder ? (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'rgba(131,80,34,0.1)', color: '#835022' }}>
                          Made to Order
                        </span>
                      ) : isOutOfStock ? (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>
                          Low Stock ({stock})
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                          In Stock ({stock})
                        </span>
                      )}
                    </td>

                    {/* Made-to-order toggle */}
                    <td style={{ padding: '8px 14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(i.madeToOrder)}
                          onChange={(e) => handleStockChange(i.id, 'madeToOrder', e.target.checked)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {i.madeToOrder ? `Yes (${i.leadTimeWeeks || 3}w)` : 'No'}
                      </label>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          disabled={savingId === i.id}
                          onClick={() => handleSaveItem(i)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {savingId === i.id ? '...' : 'Save'}
                        </button>

                        <button
                          type="button"
                          title={i.status === 'archived' ? 'Unarchive product' : 'Archive product (hide from storefront)'}
                          onClick={() => handleToggleArchive(i)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border-subtle)',
                            background: '#fff',
                            color: i.status === 'archived' ? '#15803d' : 'var(--text-muted)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {i.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>

                        <button
                          type="button"
                          title="Full product editor"
                          onClick={() => navigate(`/products/${i.id}`)}
                          style={{
                            padding: 4,
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
