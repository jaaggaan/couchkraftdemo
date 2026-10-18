
// ============================================================================
// PRODUCT CUSTOMIZATION SETTINGS COMPONENT
// ============================================================================
function CustomizationEditor({
  customization,
  enabled,
  onToggleEnabled,
  onChange,
}: {
  customization: any
  enabled: boolean
  onToggleEnabled: (val: boolean) => void
  onChange: (updated: any) => void
}) {
  const c = customization || {}
  const seatingOptions = Array.isArray(c.seatingOptions) ? c.seatingOptions : []
  const fabrics = Array.isArray(c.fabrics) ? c.fabrics : []
  const colors = Array.isArray(c.colors) ? c.colors : []
  const finishes = Array.isArray(c.finishes) ? c.finishes : []
  const materials = Array.isArray(c.materials) ? c.materials : []
  const dimSpecs = c.dimensionSpecs || {
    width: { enabled: true, min: 160, max: 280, step: 5, defaultVal: 200, unit: 'cm', pricePerUnitDelta: 100 },
    depth: { enabled: true, min: 80, max: 110, step: 5, defaultVal: 90, unit: 'cm' },
    height: { enabled: true, min: 70, max: 95, step: 5, defaultVal: 80, unit: 'cm' },
  }

  const update = (patch: any) => {
    onChange({ ...c, ...patch })
  }

  // Seating helpers
  const addSeating = () => {
    const next = [...seatingOptions, { id: `seat_${Date.now()}`, label: 'New Seating Option', priceDelta: 0, description: '' }]
    update({ seatingOptions: next })
  }
  const editSeating = (idx: number, patch: any) => {
    const next = [...seatingOptions]
    next[idx] = { ...next[idx], ...patch }
    update({ seatingOptions: next })
  }
  const removeSeating = (idx: number) => {
    update({ seatingOptions: seatingOptions.filter((_: any, i: number) => i !== idx) })
  }
  const moveSeating = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= seatingOptions.length) return
    const next = [...seatingOptions]
    const temp = next[idx]
    next[idx] = next[target]
    next[target] = temp
    update({ seatingOptions: next })
  }

  // Dimension helpers
  const setDimSpec = (axis: 'width' | 'depth' | 'height', field: string, val: any) => {
    const nextSpecs = {
      ...dimSpecs,
      [axis]: {
        ...(dimSpecs[axis] || {}),
        [field]: val,
      },
    }
    update({ dimensionSpecs: nextSpecs })
  }

  // Fabric helpers
  const addFabric = () => {
    const next = [...fabrics, { id: `fab_${Date.now()}`, label: 'New Fabric Option', priceDelta: 0, description: '' }]
    update({ fabrics: next })
  }
  const editFabric = (idx: number, patch: any) => {
    const next = [...fabrics]
    next[idx] = { ...next[idx], ...patch }
    update({ fabrics: next })
  }
  const removeFabric = (idx: number) => {
    update({ fabrics: fabrics.filter((_: any, i: number) => i !== idx) })
  }
  const moveFabric = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fabrics.length) return
    const next = [...fabrics]
    const temp = next[idx]
    next[idx] = next[target]
    next[target] = temp
    update({ fabrics: next })
  }

  // Color helpers
  const addColor = () => {
    const next = [...colors, { id: `col_${Date.now()}`, label: 'New Color', swatchHex: '#C5A880', priceDelta: 0 }]
    update({ colors: next })
  }
  const editColor = (idx: number, patch: any) => {
    const next = [...colors]
    next[idx] = { ...next[idx], ...patch }
    update({ colors: next })
  }
  const removeColor = (idx: number) => {
    update({ colors: colors.filter((_: any, i: number) => i !== idx) })
  }
  const moveColor = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= colors.length) return
    const next = [...colors]
    const temp = next[idx]
    next[idx] = next[target]
    next[target] = temp
    update({ colors: next })
  }

  // Finish helpers
  const addFinish = () => {
    const next = [...finishes, { id: `fin_${Date.now()}`, label: 'New Finish', priceDelta: 0 }]
    update({ finishes: next })
  }
  const editFinish = (idx: number, patch: any) => {
    const next = [...finishes]
    next[idx] = { ...next[idx], ...patch }
    update({ finishes: next })
  }
  const removeFinish = (idx: number) => {
    update({ finishes: finishes.filter((_: any, i: number) => i !== idx) })
  }

  // Material helpers
  const addMaterial = () => {
    const next = [...materials, { id: `mat_${Date.now()}`, label: 'New Wood/Material', priceDelta: 0 }]
    update({ materials: next })
  }
  const editMaterial = (idx: number, patch: any) => {
    const next = [...materials]
    next[idx] = { ...next[idx], ...patch }
    update({ materials: next })
  }
  const removeMaterial = (idx: number) => {
    update({ materials: materials.filter((_: any, i: number) => i !== idx) })
  }

  const miniBtn: React.CSSProperties = {
    padding: '4px 8px', borderRadius: 4, border: 'none', background: 'var(--surface-cream)',
    fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)',
  }

  return (
    <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>tune</span>
          </div>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600, margin: 0 }}>Product Customization Settings</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure bespoke options, seating, dimension ranges, swatches, and price surcharges</div>
          </div>
        </div>

        {/* CUSTOMIZABLE YES/NO TOGGLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-cream)', padding: '6px 12px', borderRadius: 999 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? 'var(--primary)' : 'var(--text-muted)' }}>
            Customizable: {enabled ? 'Yes' : 'No'}
          </span>
          <button
            type="button"
            onClick={() => onToggleEnabled(!enabled)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
              background: enabled ? 'var(--primary)' : '#d1d5db', transition: 'background 0.2s', padding: 2,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transform: enabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s',
            }} />
          </button>
        </div>
      </div>

      {!enabled ? (
        <div style={{ padding: '16px 20px', borderRadius: 8, background: 'var(--surface-cream)', color: 'var(--text-muted)', fontSize: 13 }}>
          Customization is currently disabled for this product. Storefront customers will see standard pricing and normal variant options without the "Customize This Product" suite.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. SEATING OPTIONS */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>1. Seating Capacity Options</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configurable seating options (e.g. 2-seater, 3-seater, 4-seater, L-shaped)</div>
              </div>
              <button type="button" onClick={addSeating} style={{ ...miniBtn, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                + Add Seating Option
              </button>
            </div>

            {seatingOptions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No seating options configured. Click "+ Add Seating Option" to add one.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {seatingOptions.map((opt: any, idx: number) => (
                  <div key={opt.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: 10, alignItems: 'center', background: 'var(--surface-cream)', padding: 10, borderRadius: 8 }}>
                    <input
                      type="text"
                      placeholder="Label (e.g. 3-Seater)"
                      value={opt.label || ''}
                      onChange={(e) => editSeating(idx, { label: e.target.value })}
                      style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+₹</span>
                      <input
                        type="number"
                        placeholder="Price Delta"
                        value={opt.priceDelta ?? 0}
                        onChange={(e) => editSeating(idx, { priceDelta: +e.target.value })}
                        style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description (e.g. Width 220cm)"
                      value={opt.description || ''}
                      onChange={(e) => editSeating(idx, { description: e.target.value })}
                      style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => moveSeating(idx, -1)} disabled={idx === 0} style={miniBtn}>↑</button>
                      <button type="button" onClick={() => moveSeating(idx, 1)} disabled={idx === seatingOptions.length - 1} style={miniBtn}>↓</button>
                      <button type="button" onClick={() => removeSeating(idx)} style={{ ...miniBtn, color: 'var(--error)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. CONFIGURABLE DIMENSIONS */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>2. Dimensions &amp; Permitted Ranges</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set minimum, maximum, step, default and optional surcharge per cm/inch</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {/* Width */}
              <div style={{ background: 'var(--surface-cream)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--primary)' }}>Width Range</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Min (cm)</label>
                    <input type="number" value={dimSpecs.width?.min ?? 160} onChange={(e) => setDimSpec('width', 'min', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Max (cm)</label>
                    <input type="number" value={dimSpecs.width?.max ?? 280} onChange={(e) => setDimSpec('width', 'max', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Default</label>
                    <input type="number" value={dimSpecs.width?.defaultVal ?? 200} onChange={(e) => setDimSpec('width', 'defaultVal', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Extra ₹/cm</label>
                    <input type="number" value={dimSpecs.width?.pricePerUnitDelta ?? 0} onChange={(e) => setDimSpec('width', 'pricePerUnitDelta', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                </div>
              </div>

              {/* Depth */}
              <div style={{ background: 'var(--surface-cream)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--primary)' }}>Depth Range</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Min (cm)</label>
                    <input type="number" value={dimSpecs.depth?.min ?? 80} onChange={(e) => setDimSpec('depth', 'min', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Max (cm)</label>
                    <input type="number" value={dimSpecs.depth?.max ?? 110} onChange={(e) => setDimSpec('depth', 'max', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Default (cm)</label>
                    <input type="number" value={dimSpecs.depth?.defaultVal ?? 90} onChange={(e) => setDimSpec('depth', 'defaultVal', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                </div>
              </div>

              {/* Height */}
              <div style={{ background: 'var(--surface-cream)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--primary)' }}>Height Range</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Min (cm)</label>
                    <input type="number" value={dimSpecs.height?.min ?? 70} onChange={(e) => setDimSpec('height', 'min', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Max (cm)</label>
                    <input type="number" value={dimSpecs.height?.max ?? 95} onChange={(e) => setDimSpec('height', 'max', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: 'var(--text-muted)', display: 'block' }}>Default (cm)</label>
                    <input type="number" value={dimSpecs.height?.defaultVal ?? 80} onChange={(e) => setDimSpec('height', 'defaultVal', +e.target.value)} style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FABRICS & UPHOLSTERY */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>3. Fabrics &amp; Upholstery</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configurable fabrics with optional variant charges (e.g. Linen, Velvet, Leather)</div>
              </div>
              <button type="button" onClick={addFabric} style={{ ...miniBtn, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                + Add Fabric
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fabrics.map((f: any, idx: number) => (
                <div key={f.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: 10, alignItems: 'center', background: 'var(--surface-cream)', padding: 10, borderRadius: 8 }}>
                  <input
                    type="text"
                    placeholder="Fabric name (e.g. Belgian Linen)"
                    value={f.label || ''}
                    onChange={(e) => editFabric(idx, { label: e.target.value })}
                    style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+₹</span>
                    <input
                      type="number"
                      placeholder="Extra Charge"
                      value={f.priceDelta ?? 0}
                      onChange={(e) => editFabric(idx, { priceDelta: +e.target.value })}
                      style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Short description"
                    value={f.description || ''}
                    onChange={(e) => editFabric(idx, { description: e.target.value })}
                    style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" onClick={() => moveFabric(idx, -1)} disabled={idx === 0} style={miniBtn}>↑</button>
                    <button type="button" onClick={() => moveFabric(idx, 1)} disabled={idx === fabrics.length - 1} style={miniBtn}>↓</button>
                    <button type="button" onClick={() => removeFabric(idx)} style={{ ...miniBtn, color: 'var(--error)' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. COLOR SWATCHES */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>4. Color Swatches</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Curated color palette with visual hex preview and optional surcharge</div>
              </div>
              <button type="button" onClick={addColor} style={{ ...miniBtn, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                + Add Color Swatch
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colors.map((c: any, idx: number) => (
                <div key={c.id || idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 140px auto', gap: 10, alignItems: 'center', background: 'var(--surface-cream)', padding: 10, borderRadius: 8 }}>
                  <input
                    type="color"
                    value={c.swatchHex || '#C5A880'}
                    onChange={(e) => editColor(idx, { swatchHex: e.target.value })}
                    style={{ width: 34, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    placeholder="Color Name (e.g. Warm Ivory)"
                    value={c.label || ''}
                    onChange={(e) => editColor(idx, { label: e.target.value })}
                    style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                  />
                  <input
                    type="text"
                    placeholder="Hex Code"
                    value={c.swatchHex || '#C5A880'}
                    onChange={(e) => editColor(idx, { swatchHex: e.target.value })}
                    style={{ height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+₹</span>
                    <input
                      type="number"
                      placeholder="Extra Charge"
                      value={c.priceDelta ?? 0}
                      onChange={(e) => editColor(idx, { priceDelta: +e.target.value })}
                      style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" onClick={() => moveColor(idx, -1)} disabled={idx === 0} style={miniBtn}>↑</button>
                    <button type="button" onClick={() => moveColor(idx, 1)} disabled={idx === colors.length - 1} style={miniBtn}>↓</button>
                    <button type="button" onClick={() => removeColor(idx)} style={{ ...miniBtn, color: 'var(--error)' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. FINISHES & MATERIALS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Finishes */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>5. Wood / Metal Finishes</h3>
                <button type="button" onClick={addFinish} style={{ ...miniBtn, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                  + Add Finish
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {finishes.map((f: any, idx: number) => (
                  <div key={f.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, alignItems: 'center', background: 'var(--surface-cream)', padding: 8, borderRadius: 6 }}>
                    <input
                      type="text"
                      placeholder="Finish Name"
                      value={f.label || ''}
                      onChange={(e) => editFinish(idx, { label: e.target.value })}
                      style={{ height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={f.priceDelta ?? 0}
                        onChange={(e) => editFinish(idx, { priceDelta: +e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <button type="button" onClick={() => removeFinish(idx)} style={{ ...miniBtn, color: 'var(--error)' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>6. Structural Materials</h3>
                <button type="button" onClick={addMaterial} style={{ ...miniBtn, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                  + Add Material
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {materials.map((m: any, idx: number) => (
                  <div key={m.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, alignItems: 'center', background: 'var(--surface-cream)', padding: 8, borderRadius: 6 }}>
                    <input
                      type="text"
                      placeholder="Material (e.g. Teak Hardwood)"
                      value={m.label || ''}
                      onChange={(e) => editMaterial(idx, { label: e.target.value })}
                      style={{ height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={m.priceDelta ?? 0}
                        onChange={(e) => editMaterial(idx, { priceDelta: +e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <button type="button" onClick={() => removeMaterial(idx)} style={{ ...miniBtn, color: 'var(--error)' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

import { ImageUploader } from '../components/ImageUploader'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

const defaults = {
  name: '', sku: '', slug: '', price: 0, compareAt: 0, category: 'Living Room > Sofas & Couches',
  subCategory: '3-Seater Sofas', shortExcerpt: '', description: '', gstSlab: '18% GST (Standard Furniture)',
  hsnCode: '9403 6000', images: [] as string[], videoUrl: '', finishes: ['Standard'],
  dimensions: { width: 200, depth: 90, height: 80, seatHeight: 42 },
  netWeight: '50 kg', seatingCapacity: '3 Persons', warranty: '5 Years Structural Frame',
  structuralWood: 'Kiln-dried Teak & Sheesham Hardwood',
  foamUpholstery: '38-Density Ultra-Cell Foam + Belgian Linen Blend',
  readyToShipStock: 0, lowStockThreshold: 2, madeToOrder: true, leadTimeWeeks: 3,
  customizationEnabled: true,
  customizationOptions: {
    enabled: true,
    seatingOptions: [
      { id: '2-seater', label: '2-Seater (Compact)', priceDelta: -8000, description: 'Width 170cm' },
      { id: '3-seater', label: '3-Seater (Standard)', priceDelta: 0, description: 'Width 220cm' },
      { id: '4-seater', label: '4-Seater (Grand)', priceDelta: 14000, description: 'Width 270cm' },
      { id: 'l-shape', label: 'L-Shaped Sectional', priceDelta: 32000, description: 'Chaise lounger configuration' },
    ],
    dimensionSpecs: {
      width: { enabled: true, min: 160, max: 280, step: 5, defaultVal: 200, unit: 'cm', pricePerUnitDelta: 120 },
      depth: { enabled: true, min: 80, max: 110, step: 5, defaultVal: 90, unit: 'cm' },
      height: { enabled: true, min: 70, max: 95, step: 5, defaultVal: 80, unit: 'cm' },
    },
    fabrics: [
      { id: 'boucle', label: 'Heavy Textured Bouclé', priceDelta: 0, description: 'Plush tactile warmth' },
      { id: 'linen', label: 'Belgian Linen Blend', priceDelta: 3500, description: 'Stonewashed breathable luxury' },
      { id: 'velvet', label: 'Royal Velvet', priceDelta: 6000, description: 'Stain-resistant architectural velvet' },
      { id: 'leather', label: 'Full-Grain Italian Leather', priceDelta: 28000, description: 'Supple hand-finished leather' },
    ],
    colors: [
      { id: 'ivory', label: 'Warm Ivory', swatchHex: '#E8DFC9', priceDelta: 0 },
      { id: 'rust', label: 'Terracotta Rust', swatchHex: '#B35438', priceDelta: 0 },
      { id: 'moss', label: 'Olive Moss', swatchHex: '#5D6B57', priceDelta: 0 },
      { id: 'taupe', label: 'Muted Taupe', swatchHex: '#9C8F84', priceDelta: 0 },
    ],
    finishes: [
      { id: 'nat-oak', label: 'Natural White Oak', priceDelta: 0 },
      { id: 'walnut', label: 'Dark American Walnut', priceDelta: 2500 },
    ],
    materials: [
      { id: 'teak', label: 'Kiln-Dried Teak Wood Frame', priceDelta: 0 },
      { id: 'sheesham', label: 'Seasoned Sheesham Hardwood', priceDelta: -3000 },
    ],
  },
  customizationToleranceCm: 15, allowComUpholstery: true,
  metaTitle: '', metaDescription: '', status: 'draft' as const, care: '',
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.02em' }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 14px', borderRadius: 8, border: 'none',
  background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)', outline: 'none',
}

export function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [form, setForm] = useState(defaults)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!isNew) {
      adminApi.getProduct(id!).then(d => {
        setForm({ ...defaults, ...d.product })
      }).catch(() => navigate('/products'))
    }
  }, [id])

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))
  const setDim = (key: string, val: number) => setForm(f => ({ ...f, dimensions: { ...f.dimensions, [key]: val } }))

  const handleSave = async (status?: string) => {
    setSaving(true)
    setMsg('')
    try {
      const payload = { ...form, status: status || form.status }
      if (isNew) {
        await adminApi.createProduct(payload)
        setMsg('Product created!')
        setTimeout(() => navigate('/products'), 800)
      } else {
        await adminApi.updateProduct(id!, payload)
        setMsg('Product updated!')
      }
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* STICKY TOP BAR */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30, background: 'rgba(253,251,247,0.95)',
        backdropFilter: 'blur(12px)', padding: '12px 0', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/products')} style={{ padding: 8, borderRadius: 8, border: 'none', background: '#fff', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-muted)' }}>arrow_back</span>
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>{isNew ? 'New Product' : 'Edit Product'}</div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{form.name || 'Untitled Product'}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: msg.includes('!') ? 'var(--secondary)' : 'var(--error)', fontWeight: 600 }}>{msg}</span>}
          <button onClick={() => handleSave('draft')} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>Save Draft</button>
          <button onClick={() => handleSave('published')} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(131,80,34,0.25)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_upload</span>
            Publish
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* General Info */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>stylus_note</span>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>General Information</h2>
            </div>
            <Field label="Product Title">
              <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="SKU"><input value={form.sku} onChange={e => set('sku', e.target.value)} style={inputStyle} /></Field>
              <Field label="URL Slug"><input value={form.slug} onChange={e => set('slug', e.target.value)} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Primary Category">
                <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option>Living Room &gt; Sofas &amp; Couches</option>
                  <option>Bedroom &gt; Lounge Chairs</option>
                  <option>Dining &gt; Benches &amp; Storage</option>
                  <option>Study &gt; Accent Seating</option>
                </select>
              </Field>
              <Field label="Sub-Classification"><input value={form.subCategory} onChange={e => set('subCategory', e.target.value)} style={inputStyle} /></Field>
            </div>
            <Field label="Short Excerpt" hint={`${(form.shortExcerpt || '').length} / 160 characters`}>
              <textarea value={form.shortExcerpt} onChange={e => set('shortExcerpt', e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'none' }} />
            </Field>
            <Field label="Full Description">
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'none', lineHeight: 1.6 }} />
            </Field>
          </section>

          {/* Pricing */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>payments</span>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>Commercials & Valuation</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Selling Price (₹)"><input type="number" value={form.price} onChange={e => set('price', +e.target.value)} style={inputStyle} /></Field>
              <Field label="MRP (₹)"><input type="number" value={form.compareAt} onChange={e => set('compareAt', +e.target.value)} style={inputStyle} /></Field>
              <Field label="GST Slab">
                <select value={form.gstSlab} onChange={e => set('gstSlab', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option>18% GST (Standard Furniture)</option>
                  <option>12% GST (Cane / Woven Crafts)</option>
                  <option>28% GST (Luxury Velvet Imports)</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Dimensions & Specs */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>straighten</span>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>Specifications</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <Field label="Width (cm)"><input type="number" value={form.dimensions.width} onChange={e => setDim('width', +e.target.value)} style={inputStyle} /></Field>
              <Field label="Depth (cm)"><input type="number" value={form.dimensions.depth} onChange={e => setDim('depth', +e.target.value)} style={inputStyle} /></Field>
              <Field label="Height (cm)"><input type="number" value={form.dimensions.height} onChange={e => setDim('height', +e.target.value)} style={inputStyle} /></Field>
              <Field label="Seat Height"><input type="number" value={form.dimensions.seatHeight} onChange={e => setDim('seatHeight', +e.target.value)} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Net Weight"><input value={form.netWeight} onChange={e => set('netWeight', e.target.value)} style={inputStyle} /></Field>
              <Field label="Seating Capacity"><input value={form.seatingCapacity} onChange={e => set('seatingCapacity', e.target.value)} style={inputStyle} /></Field>
              <Field label="Warranty"><input value={form.warranty} onChange={e => set('warranty', e.target.value)} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Structural Wood"><input value={form.structuralWood} onChange={e => set('structuralWood', e.target.value)} style={inputStyle} /></Field>
              <Field label="Foam & Upholstery"><input value={form.foamUpholstery} onChange={e => set('foamUpholstery', e.target.value)} style={inputStyle} /></Field>
            </div>
          </section>

          {/* Inventory */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>inventory_2</span>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>Inventory & Fulfillment</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Ready-to-Ship Stock"><input type="number" value={form.readyToShipStock} onChange={e => set('readyToShipStock', +e.target.value)} style={inputStyle} /></Field>
              <Field label="Low Stock Threshold"><input type="number" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', +e.target.value)} style={inputStyle} /></Field>
              <Field label="Lead Time (weeks)"><input type="number" value={form.leadTimeWeeks} onChange={e => set('leadTimeWeeks', +e.target.value)} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.madeToOrder} onChange={e => set('madeToOrder', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Made-to-Order Pipeline
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.customizationEnabled} onChange={e => set('customizationEnabled', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                Customization Enabled
              </label>
            </div>
          </section>

          {/* CUSTOMIZATION SETTINGS SUITE */}
          <CustomizationEditor
            customization={form.customizationOptions}
            enabled={form.customizationEnabled}
            onToggleEnabled={(val) => {
              set('customizationEnabled', val)
              set('customizationOptions', { ...(form.customizationOptions || {}), enabled: val })
            }}
            onChange={(updated) => set('customizationOptions', updated)}
          />

          {/* SEO */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>travel_explore</span>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600 }}>SEO & Meta</h2>
            </div>
            <Field label="Meta Page Title"><input value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} style={inputStyle} /></Field>
            <Field label="Meta Description"><textarea value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'none' }} /></Field>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 140 }}>
          {/* Media & Image Uploader */}
          <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add_photo_alternate</span>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 600 }}>Media &amp; Images</h3>
            </div>
            <ImageUploader
              images={form.images || []}
              onChange={(nextImages) => set('images', nextImages)}
              productSlug={form.slug || form.name}
            />
          </section>

          {/* Preview Card */}
          {form.images?.[0] && (
            <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Storefront Preview</h3>
              <div style={{ background: 'var(--surface-cream)', borderRadius: 12, padding: 12, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', marginBottom: 10, background: 'var(--surface-container)' }}>
                  <img src={form.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{form.category}</div>
                <div style={{ fontFamily: 'Playfair Display', fontWeight: 600, fontSize: 16, marginTop: 4 }}>{form.name || 'Product Name'}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 18 }}>₹{(form.price || 0).toLocaleString('en-IN')}</span>
                  {form.compareAt > form.price && <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{(form.compareAt || 0).toLocaleString('en-IN')}</span>}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
