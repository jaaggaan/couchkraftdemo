import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

export function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => { adminApi.getCategories().then(d => setCategories(d.categories)).catch(() => {}) }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    const { category } = await adminApi.createCategory({ name: newName, description: newDesc }) as any
    setCategories(cs => [...cs, category])
    setNewName(''); setNewDesc(''); setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products will not be removed.')) return
    await adminApi.deleteCategory(id)
    setCategories(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Categories</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Category
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', display: 'flex', gap: 12, alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Living Room > Sofas" style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description..." style={{ width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }} />
          </div>
          <button onClick={handleAdd} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: 'var(--secondary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Create</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {categories.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ height: 120, background: 'var(--surface-container)', overflow: 'hidden' }}>
              {c.image && <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: 16 }}>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{c.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{c.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{c.productCount} products • /{c.slug}</span>
                <button onClick={() => handleDelete(c.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
              {c.subClassifications?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {c.subClassifications.map((s: string) => <span key={s} style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--surface-muted)', fontSize: 11, color: 'var(--text-secondary)' }}>{s}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
