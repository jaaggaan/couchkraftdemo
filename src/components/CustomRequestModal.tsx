import { buildCustomFurnitureWhatsAppMessage, getWhatsAppUrl, COUCHKRAFT_WHATSAPP_PHONE } from '../utils/whatsapp'
import { useState, useEffect } from 'react'

export type CustomRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  product?: {
    id: string
    name: string
    slug: string
    category?: string
    image?: string
  } | null
}

export function CustomRequestModal({ isOpen, onClose, product }: CustomRequestModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pieceName, setPieceName] = useState(product?.name || '')
  const [seating, setSeating] = useState('3-Seater')
  const [dimensions, setDimensions] = useState('220cm W × 95cm D × 80cm H')
  const [material, setMaterial] = useState('Kiln-Dried Teak Wood & Belgian Linen')
  const [color, setColor] = useState('Warm Ivory / Oatmeal')
  const [budget, setBudget] = useState('₹75,000 – ₹1,50,000')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [businessPhone, setBusinessPhone] = useState<string>('+91 63607 04340')

  // Fetch WhatsApp settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then((r) => r.json())
      .then((d) => {
        if (d?.whatsapp?.businessPhone) {
          setBusinessPhone(d.whatsapp.businessPhone)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      setPieceName(product.name)
    }
  }, [product])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      setStatusMsg('Please provide your phone number so our atelier can follow up.')
      return
    }

    setLoading(true)
    setStatusMsg('')

    try {
      const canonicalUrl = typeof window !== 'undefined' && product?.slug ? `${window.location.origin}/product/${product.slug}` : window.location.href

      // 1. Persist the bespoke enquiry into database
      const res = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          productId: product?.id,
          productName: pieceName || (product ? product.name : 'Custom Bespoke Furniture'),
          productUrl: canonicalUrl,
          seatingCapacity: seating,
          dimensions: { raw: dimensions },
          material,
          color,
          budget,
          notes,
        }),
      })
      await res.json()

      // 2. Check if business WhatsApp number is configured
      const cleanPhone = (businessPhone || '').replace(/[^0-9]/g, '')

      if (cleanPhone && cleanPhone.length >= 7) {
        // Construct pre-filled concise template with placeholders completed
        const msg = buildCustomFurnitureWhatsAppMessage({
          productName: pieceName || (product ? product.name : 'Custom Furniture Piece'),
          productUrl: canonicalUrl,
          clientName: name,
          clientPhone: phone,
          seating,
          dimensions,
          material,
          color,
          budget,
          notes,
        })

        const waUrl = getWhatsAppUrl(cleanPhone || COUCHKRAFT_WHATSAPP_PHONE, msg)
        
        // Open WhatsApp immediately (and allow direct link fallback)
        try {
          window.open(waUrl, '_blank')
        } catch {}
        
        setStatusMsg('Enquiry submitted! Opening WhatsApp with your pre-filled specifications. If WhatsApp did not open automatically, click the button below.')
      } else {
        // Helpful message if business WhatsApp number is not configured in admin settings
        setStatusMsg(
          'Your bespoke commission enquiry has been successfully registered in our atelier database! (Note: CouchKraft WhatsApp Business concierge is currently being configured by the administrator in Admin Settings, and our atelier concierge will contact you directly via your provided phone and email).'
        )
      }
    } catch {
      setStatusMsg('Unable to submit enquiry at this moment. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.65)',
        backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 580, maxHeight: '90vh', background: '#fff',
          borderRadius: 16, overflowY: 'auto', padding: 28, position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20, border: 'none',
            background: 'var(--surface-cream, #f5f0eb)', width: 32, height: 32,
            borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--text-muted, #78716c)',
          }}
        >
          ✕
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#835022', textTransform: 'uppercase' }}>
            CouchKraft Atelier Commission
          </div>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 600, color: '#1c1917', margin: '4px 0 8px' }}>
            Request Custom-Made Furniture
          </h2>
          <p style={{ color: '#78716c', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Every home has singular architectural proportions. Share your custom dimensions, preferred fabrics, or silhouette requirements for a personalized atelier estimate.
          </p>
        </div>

        {statusMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: statusMsg.includes('registered') ? '#dcfce7' : '#fef3c7',
            color: statusMsg.includes('registered') ? '#166534' : '#92400e',
            lineHeight: 1.5, fontWeight: 500,
          }}>
            {statusMsg}
            <div style={{ marginTop: 10 }}>
              <a
                href={getWhatsAppUrl(
                  businessPhone || COUCHKRAFT_WHATSAPP_PHONE,
                  buildCustomFurnitureWhatsAppMessage({
                    productName: pieceName || (product ? product.name : 'Custom Furniture Piece'),
                    productUrl: typeof window !== 'undefined' ? window.location.href : '',
                    clientName: name,
                    clientPhone: phone,
                    seating,
                    dimensions,
                    material,
                    color,
                    budget,
                    notes,
                  })
                )}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  borderRadius: 6, background: '#29241f', color: '#fff', textDecoration: 'none',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                <span>💬</span> Click Here to Open WhatsApp Directly with Pre-Loaded Message
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Piece Reference */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
              Furniture Piece Reference
            </label>
            <input
              type="text"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              placeholder="E.g. Arden Three-Seater Custom Sectional, or Bespoke Dining Table"
              style={{
                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
              }}
            />
          </div>

          {/* Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Phone Number (WhatsApp) *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@example.com"
              style={{
                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
              }}
            />
          </div>

          {/* Custom Specifications */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Seating Capacity / Type
              </label>
              <input
                type="text"
                value={seating}
                onChange={(e) => setSeating(e.target.value)}
                placeholder="3-Seater / L-Shaped / Accent"
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Custom Dimensions
              </label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="220cm W × 95cm D × 80cm H"
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Material &amp; Fabric Preference
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Kiln-Dried Teak, Linen, Velvet..."
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
                Color / Palette Tone
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Warm Ivory, Moss, Walnut..."
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
              Target Budget Range
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="₹75,000 – ₹1,50,000"
              style={{
                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#44403c', marginBottom: 4 }}>
              Architectural Room Notes &amp; Special Constraints
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Lift size constraints, left chaise orientation, brass feet accents, pet-resistant fabric..."
              style={{
                width: '100%', padding: 10, borderRadius: 8,
                border: '1px solid #e7e5e4', background: '#fafaf9', fontSize: 13, resize: 'none',
              }}
            />
          </div>

          {/* LIVE PRE-LOADED WHATSAPP MESSAGE PREVIEW */}
          <div style={{
            background: 'rgba(120, 99, 78, 0.08)', borderRadius: 10, padding: 14,
            border: '1px solid rgba(120, 99, 78, 0.25)', marginTop: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#5e4b39', textTransform: 'uppercase' }}>
                ✓ Pre-Loaded WhatsApp Message Preview
              </div>
              <span style={{ fontSize: 11, color: '#78634e', fontWeight: 600 }}>CouchKraft: +91 63607 04340</span>
            </div>
            <pre style={{
              margin: 0, fontSize: 11, color: '#1c1917', background: '#fff',
              padding: 10, borderRadius: 6, border: '1px solid #e7e5e4',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.45, maxHeight: 120, overflowY: 'auto',
            }}>
              {buildCustomFurnitureWhatsAppMessage({
                productName: pieceName || (product ? product.name : 'Custom Furniture Piece'),
                productUrl: typeof window !== 'undefined' ? window.location.href : '',
                clientName: name || '[Your Name]',
                clientPhone: phone || '[Your Phone]',
                seating,
                dimensions,
                material,
                color,
                budget,
                notes,
              })}
            </pre>
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 20px', borderRadius: 8, border: 'none',
                background: '#29241f', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, boxShadow: '0 4px 14px rgba(41,36,31,0.18)',
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              {loading ? 'Submitting to Atelier...' : 'Submit & Connect on WhatsApp'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#78716c', marginTop: 8 }}>
              This is a bespoke enquiry and consultation flow, not an immediate payment or charge.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
