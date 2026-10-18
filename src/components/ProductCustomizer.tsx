import { useState, useEffect } from 'react'
import type { Product, SelectedCustomization } from '../data/products'
import { formatPrice } from '../utils/format'

export function ProductCustomizer({
  product,
  onChange,
}: {
  product: Product
  onChange: (customization: SelectedCustomization, totalPrice: number) => void
}) {
  const config = product.customizationOptions
  if (!config || !config.enabled) return null

  const seatingList = config.seatingOptions || []
  const dimSpecs = config.dimensionSpecs || {}
  const fabrics = config.fabrics || []
  const colors = config.colors || []
  const finishes = config.finishes || []
  const materials = config.materials || []

  // Initialize selected options with defaults
  const [selectedSeating, setSelectedSeating] = useState<any>(seatingList[0] || null)
  const [width, setWidth] = useState<number>(dimSpecs.width?.defaultVal || 200)
  const [depth, setDepth] = useState<number>(dimSpecs.depth?.defaultVal || 90)
  const [height, setHeight] = useState<number>(dimSpecs.height?.defaultVal || 80)
  const [selectedFabric, setSelectedFabric] = useState<any>(fabrics[0] || null)
  const [selectedColor, setSelectedColor] = useState<any>(colors[0] || null)
  const [selectedFinish, setSelectedFinish] = useState<any>(finishes[0] || null)
  const [selectedMaterial, setSelectedMaterial] = useState<any>(materials[0] || null)
  const [notes, setNotes] = useState<string>('')

  // Calculate live delta
  let delta = 0
  if (selectedSeating) delta += Number(selectedSeating.priceDelta) || 0

  // Width surcharge if exceeding default
  if (dimSpecs.width?.pricePerUnitDelta && width > (dimSpecs.width.defaultVal || 200)) {
    const over = width - (dimSpecs.width.defaultVal || 200)
    delta += over * Number(dimSpecs.width.pricePerUnitDelta)
  }

  if (selectedFabric) delta += Number(selectedFabric.priceDelta) || 0
  if (selectedColor) delta += Number(selectedColor.priceDelta) || 0
  if (selectedFinish) delta += Number(selectedFinish.priceDelta) || 0
  if (selectedMaterial) delta += Number(selectedMaterial.priceDelta) || 0

  const totalPrice = Math.max(0, product.price + delta)

  useEffect(() => {
    const payload: SelectedCustomization = {
      seating: selectedSeating?.label,
      seatingPriceDelta: selectedSeating?.priceDelta,
      width,
      depth,
      height,
      dimensionUnit: dimSpecs.width?.unit || 'cm',
      dimensionPriceDelta: dimSpecs.width?.pricePerUnitDelta && width > (dimSpecs.width.defaultVal || 200)
        ? (width - (dimSpecs.width.defaultVal || 200)) * Number(dimSpecs.width.pricePerUnitDelta)
        : 0,
      fabric: selectedFabric?.label,
      fabricPriceDelta: selectedFabric?.priceDelta,
      color: selectedColor?.label,
      colorHex: selectedColor?.swatchHex,
      colorPriceDelta: selectedColor?.priceDelta,
      finish: selectedFinish?.label,
      finishPriceDelta: selectedFinish?.priceDelta,
      material: selectedMaterial?.label,
      materialPriceDelta: selectedMaterial?.priceDelta,
      totalCustomizationDelta: delta,
      notes,
    }
    onChange(payload, totalPrice)
  }, [selectedSeating, width, depth, height, selectedFabric, selectedColor, selectedFinish, selectedMaterial, notes, delta])

  return (
    <div className="product-customizer" style={{
      margin: '24px 0', padding: 20, borderRadius: 12,
      background: 'rgba(253, 251, 247, 0.8)', border: '1px solid rgba(131, 80, 34, 0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#835022', textTransform: 'uppercase' }}>
            Atelier Bespoke Suite
          </div>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Customize This Product
          </h2>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Made-to-order · {product.leadTimeWeeks || 4} weeks
        </span>
      </div>

      {/* 1. SEATING OPTIONS */}
      {seatingList.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Seating Capacity &amp; Configuration
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {seatingList.map((opt: any) => {
              const active = selectedSeating?.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedSeating(opt)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    background: active ? '#835022' : '#fff', color: active ? '#fff' : 'var(--text-primary)',
                    border: active ? '1px solid #835022' : '1px solid var(--border-subtle, #e5e0d8)',
                    boxShadow: active ? '0 2px 6px rgba(131,80,34,0.2)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.priceDelta !== 0 && (
                    <span style={{
                      fontSize: 11, opacity: 0.9,
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(131,80,34,0.1)',
                      color: active ? '#fff' : '#835022',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {opt.priceDelta > 0 ? `+₹${opt.priceDelta.toLocaleString('en-IN')}` : `−₹${Math.abs(opt.priceDelta).toLocaleString('en-IN')}`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {selectedSeating?.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
              {selectedSeating.description}
            </div>
          )}
        </div>
      )}

      {/* 2. CONFIGURABLE DIMENSIONS */}
      {(dimSpecs.width?.enabled || dimSpecs.depth?.enabled || dimSpecs.height?.enabled) && (
        <div style={{ marginBottom: 18, background: '#fff', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle, #e5e0d8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Custom Architectural Dimensions ({dimSpecs.width?.unit || 'cm'})
            </label>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Permitted ranges tailored for structural integrity
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
            {dimSpecs.width?.enabled && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Width</span>
                  <strong>{width} cm</strong>
                </div>
                <input
                  type="range"
                  min={dimSpecs.width.min || 160}
                  max={dimSpecs.width.max || 280}
                  step={dimSpecs.width.step || 5}
                  value={width}
                  onChange={(e) => setWidth(+e.target.value)}
                  style={{ width: '100%', accentColor: '#835022' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{dimSpecs.width.min}cm</span>
                  <span>{dimSpecs.width.max}cm</span>
                </div>
              </div>
            )}

            {dimSpecs.depth?.enabled && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Depth</span>
                  <strong>{depth} cm</strong>
                </div>
                <input
                  type="range"
                  min={dimSpecs.depth.min || 80}
                  max={dimSpecs.depth.max || 110}
                  step={dimSpecs.depth.step || 5}
                  value={depth}
                  onChange={(e) => setDepth(+e.target.value)}
                  style={{ width: '100%', accentColor: '#835022' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{dimSpecs.depth.min}cm</span>
                  <span>{dimSpecs.depth.max}cm</span>
                </div>
              </div>
            )}

            {dimSpecs.height?.enabled && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Height</span>
                  <strong>{height} cm</strong>
                </div>
                <input
                  type="range"
                  min={dimSpecs.height.min || 70}
                  max={dimSpecs.height.max || 95}
                  step={dimSpecs.height.step || 5}
                  value={height}
                  onChange={(e) => setHeight(+e.target.value)}
                  style={{ width: '100%', accentColor: '#835022' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{dimSpecs.height.min}cm</span>
                  <span>{dimSpecs.height.max}cm</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. FABRICS & UPHOLSTERY */}
      {fabrics.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Upholstery Fabric Selection
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {fabrics.map((f: any) => {
              const active = selectedFabric?.id === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFabric(f)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                    background: active ? '#fff' : '#faf8f5',
                    border: active ? '2px solid #835022' : '1px solid var(--border-subtle, #e5e0d8)',
                    boxShadow: active ? '0 2px 8px rgba(131,80,34,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: active ? '#835022' : 'var(--text-primary)' }}>
                      {f.label}
                    </span>
                    {f.priceDelta > 0 && (
                      <span style={{ fontSize: 11, color: '#835022', fontWeight: 600 }}>
                        +₹{f.priceDelta.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                      {f.description}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. COLOR PALETTE */}
      {colors.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Curated Color Swatch: <strong>{selectedColor?.label || 'Select'}</strong>
            </label>
            {selectedColor?.priceDelta > 0 && (
              <span style={{ fontSize: 11, color: '#835022', fontWeight: 600 }}>
                +₹{selectedColor.priceDelta.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {colors.map((c: any) => {
              const active = selectedColor?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  title={c.label}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: c.swatchHex || '#ccc',
                    border: active ? '3px solid #835022' : '2px solid #fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)', cursor: 'pointer',
                    transform: active ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s',
                    position: 'relative',
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* 5. FINISHES & MATERIALS */}
      {(finishes.length > 0 || materials.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
          {finishes.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Wood / Frame Finish
              </label>
              <select
                value={selectedFinish?.id || ''}
                onChange={(e) => setSelectedFinish(finishes.find((f: any) => f.id === e.target.value))}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
              >
                {finishes.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.label} {f.priceDelta > 0 ? `(+₹${f.priceDelta.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {materials.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Structural Hardwood Frame
              </label>
              <select
                value={selectedMaterial?.id || ''}
                onChange={(e) => setSelectedMaterial(materials.find((m: any) => m.id === e.target.value))}
                style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', fontSize: 13 }}
              >
                {materials.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.label} {m.priceDelta > 0 ? `(+₹${m.priceDelta.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 6. BESPOKE ATELIER NOTES */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Special Atelier Requests &amp; Architectural Notes (Optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={config.notesPlaceholder || 'E.g. Left-arm chaise, extra firm seat foam, brass leg caps...'}
          style={{
            width: '100%', height: 38, padding: '0 12px', borderRadius: 6,
            border: '1px solid var(--border-subtle, #e5e0d8)', background: '#fff', fontSize: 13,
          }}
        />
      </div>

      {/* 7. LIVE PRICING BREAKDOWN */}
      <div style={{
        padding: '12px 16px', borderRadius: 8, background: '#fff',
        border: '1px solid rgba(131, 80, 34, 0.2)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Base {formatPrice(product.price)} {delta > 0 && `+ Customization (${formatPrice(delta)})`}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Playfair Display', color: '#835022' }}>
            Configured Price: {formatPrice(totalPrice)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, background: '#dcfce7', padding: '4px 8px', borderRadius: 4 }}>
          ✓ Verified Price Recalculation
        </div>
      </div>
    </div>
  )
}
