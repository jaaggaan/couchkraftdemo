import { useEffect, useState, useRef, ChangeEvent } from 'react'
import { adminApi } from '../lib/api'
import { supabase } from '../lib/supabase'

interface Banner {
  id: string
  title: string
  subtitle: string
  desktopImage: string
  mobileImage: string
  ctaLabel: string
  ctaUrl: string
  badge: string
  alignment: 'left' | 'right'
  space: string
  active: boolean
  displayOrder: number
}

const defaultBanner: Omit<Banner, 'id'> = {
  title: '',
  subtitle: '',
  desktopImage: '',
  mobileImage: '',
  ctaLabel: 'Shop Collection',
  ctaUrl: '/shop',
  badge: 'NEW ARRIVAL',
  alignment: 'right',
  space: 'living',
  active: true,
  displayOrder: 1,
}

export function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultBanner)
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [msg, setMsg] = useState('')

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const loadBanners = () => {
    setLoading(true)
    adminApi.getBanners().then((d) => {
      setBanners(d.banners || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBanners()
  }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({
      ...defaultBanner,
      displayOrder: banners.length + 1,
    })
    setModalOpen(true)
    setMsg('')
  }

  const handleOpenEdit = (b: Banner) => {
    setEditingId(b.id)
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      desktopImage: b.desktopImage || '',
      mobileImage: b.mobileImage || '',
      ctaLabel: b.ctaLabel || 'Shop Collection',
      ctaUrl: b.ctaUrl || '/shop',
      badge: b.badge || '',
      alignment: b.alignment || 'right',
      space: b.space || 'living',
      active: b.active ?? true,
      displayOrder: b.displayOrder || 1,
    })
    setModalOpen(true)
    setMsg('')
  }

  const handleUploadImage = async (file: File, type: 'desktop' | 'mobile') => {
    const isDesk = type === 'desktop'
    if (isDesk) setUploadingDesktop(true)
    else setUploadingMobile(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `banner-${type}-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('products').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

      if (error) {
        throw new Error(error.message)
      }

      const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName)
      if (publicData?.publicUrl) {
        if (isDesk) setForm((f) => ({ ...f, desktopImage: publicData.publicUrl }))
        else setForm((f) => ({ ...f, mobileImage: publicData.publicUrl }))
      }
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}. You can also type or paste an image URL directly.`)
    } finally {
      if (isDesk) setUploadingDesktop(false)
      else setUploadingMobile(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setMsg('Please provide a banner title.')
      return
    }

    try {
      if (editingId) {
        await adminApi.updateBanner(editingId, form)
      } else {
        await adminApi.createBanner(form)
      }
      setModalOpen(false)
      loadBanners()
    } catch (err: any) {
      setMsg(err.message || 'Failed to save banner')
    }
  }

  const toggleActive = async (b: Banner) => {
    try {
      await adminApi.updateBanner(b.id, { active: !b.active })
      setBanners((bs) => bs.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const currentBanner = banners[index]
    const targetBanner = banners[targetIndex]

    const newCurrentOrder = targetBanner.displayOrder
    const newTargetOrder = currentBanner.displayOrder

    // Swap display order
    await adminApi.updateBanner(currentBanner.id, { displayOrder: newCurrentOrder })
    await adminApi.updateBanner(targetBanner.id, { displayOrder: newTargetOrder })
    loadBanners()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete banner "${title}" permanently?`)) return
    await adminApi.deleteBanner(id)
    setBanners((bs) => bs.filter((b) => b.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600 }}>Promotional Banners</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage homepage sliders and promotional features across desktop & mobile.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(131,80,34,0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Banner
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading banners...</div>
      ) : banners.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No promotional banners found.</p>
          <button onClick={handleOpenAdd} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Create First Banner</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {banners.map((b, index) => (
            <div
              key={b.id}
              className="banner-item-grid"
              style={{
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                display: 'grid',
                
                alignItems: 'stretch',
                border: b.active ? '1px solid var(--border-subtle)' : '1px dashed #d8d0c5',
                opacity: b.active ? 1 : 0.8,
              }}
            >
              {/* Preview Thumbnail */}
              <div style={{ width: '100%', minHeight: 160, background: 'var(--surface-container)', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={b.desktopImage || '/hero-living-hd.jpg'}
                  alt={b.title}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/hero-living-hd.jpg'
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                  Order #{b.displayOrder}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {b.badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4, background: 'var(--surface-muted)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {b.badge}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: b.active ? 'var(--status-active, #dcfce7)' : 'var(--status-warning, #fef3c7)',
                        color: b.active ? 'var(--secondary, #15803d)' : 'var(--tertiary, #b45309)',
                      }}
                    >
                      {b.active ? 'LIVE ON STOREFRONT' : 'DRAFT / HIDDEN'}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                    {b.title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    {b.subtitle}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>CTA: <strong>{b.ctaLabel}</strong> → <span style={{ color: 'var(--primary)' }}>{b.ctaUrl}</span></span>
                  <span>Align: <strong>{b.alignment}</strong></span>
                  {b.mobileImage && <span>Mobile Asset: <strong>Yes</strong></span>}
                </div>
              </div>

              {/* Controls */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, borderLeft: '1px solid var(--border-subtle)' }}>
                {/* Reorder Buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    title="Move banner earlier"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: '#fff',
                      cursor: index === 0 ? 'default' : 'pointer',
                      opacity: index === 0 ? 0.3 : 1,
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    title="Move banner later"
                    disabled={index === banners.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: '#fff',
                      cursor: index === banners.length - 1 ? 'default' : 'pointer',
                      opacity: index === banners.length - 1 ? 0.3 : 1,
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_downward</span>
                  </button>
                </div>

                {/* Edit & Status Toggle */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(b)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => toggleActive(b)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: b.active ? 'rgba(21,128,61,0.1)' : 'rgba(180,83,9,0.1)',
                    color: b.active ? '#15803d' : '#b45309',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {b.active ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(b.id, b.title)}
                  title="Delete banner"
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 600 }}>
                {editingId ? 'Edit Banner' : 'Create New Banner'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {msg && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fee2e2', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                {msg}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Banner Title *
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. In soft sculpture"
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Subtitle / Editorial Lead
                </label>
                <textarea
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  rows={2}
                  placeholder="e.g. A quiet oak frame and generous bouclé contours that belong in a sunlit living room."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Badge Tag
                  </label>
                  <input
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. NEW COLLECTION"
                    style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Text Alignment
                  </label>
                  <select
                    value={form.alignment}
                    onChange={(e) => setForm({ ...form, alignment: e.target.value as 'left' | 'right' })}
                    style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, cursor: 'pointer' }}
                  >
                    <option value="right">Right aligned</option>
                    <option value="left">Left aligned</option>
                  </select>
                </div>
              </div>

              {/* Desktop Image Upload & Preview */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Desktop Image (1600x820 recommended)
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={form.desktopImage}
                    onChange={(e) => setForm({ ...form, desktopImage: e.target.value })}
                    placeholder="/hero-living-hd.jpg or https://..."
                    style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                  />
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'desktop')}
                  />
                  <button
                    type="button"
                    disabled={uploadingDesktop}
                    onClick={() => desktopInputRef.current?.click()}
                    style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {uploadingDesktop ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
                {form.desktopImage && (
                  <div style={{ marginTop: 8, width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', background: '#f3ede2' }}>
                    <img src={form.desktopImage} alt="Desktop Preview" onError={(e) => { (e.target as HTMLImageElement).src = '/hero-living-hd.jpg' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              {/* Mobile Image Upload & Preview */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Mobile Image (optional vertical crop)
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={form.mobileImage}
                    onChange={(e) => setForm({ ...form, mobileImage: e.target.value })}
                    placeholder="/hero-living-scene.jpg or https://..."
                    style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                  />
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'mobile')}
                  />
                  <button
                    type="button"
                    disabled={uploadingMobile}
                    onClick={() => mobileInputRef.current?.click()}
                    style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {uploadingMobile ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
                {form.mobileImage && (
                  <div style={{ marginTop: 8, width: 120, height: 80, borderRadius: 8, overflow: 'hidden', background: '#f3ede2' }}>
                    <img src={form.mobileImage} alt="Mobile Preview" onError={(e) => { (e.target as HTMLImageElement).src = '/hero-living-scene.jpg' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    CTA Button Text
                  </label>
                  <input
                    value={form.ctaLabel}
                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                    placeholder="Shop the Collection"
                    style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    CTA Target Link
                  </label>
                  <input
                    value={form.ctaUrl}
                    onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                    placeholder="/shop?space=living"
                    style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-cream)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Live on storefront immediately
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  {editingId ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
