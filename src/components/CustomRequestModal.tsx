import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

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

const fieldLabel: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#44403c',
  marginBottom: 4,
}

const fieldInput: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #e7e5e4',
  background: '#fafaf9',
  fontSize: 13,
}

const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 2_500_000

type PendingReference = {
  id: string
  file: File
  preview: string
}

async function uploadReferencePhoto(file: File): Promise<string> {
  const res = await fetch('/api/custom-requests/upload', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name || 'reference.jpg'),
    },
    body: file,
  })
  if (res.status === 401) throw new Error('AUTH')
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Upload failed')
  }
  const data = (await res.json()) as { url: string }
  if (!data.url) throw new Error('Upload failed')
  return data.url
}

export function CustomRequestModal({ isOpen, onClose, product }: CustomRequestModalProps) {
  const { user, openAuth } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pieceName, setPieceName] = useState(product?.name || '')
  const [size, setSize] = useState('')
  const [look, setLook] = useState('')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [submitOk, setSubmitOk] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const [pendingImages, setPendingImages] = useState<PendingReference[]>([])
  const pendingImagesRef = useRef(pendingImages)
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  const revokePreviews = useCallback((items: PendingReference[]) => {
    items.forEach((item) => {
      if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview)
    })
  }, [])

  useEffect(() => {
    if (product) {
      setPieceName(product.name)
    }
  }, [product])

  useEffect(() => {
    if (!isOpen) return
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPhone((prev) => user.phone || prev)
    }
  }, [isOpen, user])

  useEffect(
    () => () => {
      revokePreviews(pendingImagesRef.current)
    },
    [revokePreviews],
  )

  const handleImagePick = (files: FileList | null) => {
    if (!files?.length) return
    setImageError('')
    const picked = Array.from(files).slice(0, MAX_IMAGES - pendingImages.length)
    const next: PendingReference[] = []
    for (const file of picked) {
      if (!file.type.startsWith('image/')) {
        setImageError('Please upload image files only (JPG, PNG, WebP).')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError('Each image must be under 2.5 MB.')
        continue
      }
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      })
    }
    if (next.length) setPendingImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES))
  }

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const removed = prev.find((p) => p.id === id)
      if (removed?.preview.startsWith('blob:')) URL.revokeObjectURL(removed.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const canonicalUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return product?.slug ? `${window.location.origin}/product/${product.slug}` : window.location.href
  }, [product?.slug])

  if (!isOpen) return null

  const clearFormFields = () => {
    setPieceName(product?.name || '')
    setSize('')
    setLook('')
    setBudget('')
    setNotes('')
    revokePreviews(pendingImages)
    setPendingImages([])
    setImageError('')
  }

  const resetForm = () => {
    clearFormFields()
    setStatusMsg('')
    setSubmitOk(false)
    setSubmittedId('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) {
      setStatusMsg('Please sign in to submit — we’ll link this request to your account.')
      openAuth('signin')
      return
    }
    if (!phone.trim()) {
      setStatusMsg('Please add a phone number so we can reach you.')
      setSubmitOk(false)
      return
    }

    setLoading(true)
    setStatusMsg('')
    setSubmitOk(false)

    try {
      let referenceImages: string[] = []
      if (pendingImages.length) {
        const urls = await Promise.all(pendingImages.map((item) => uploadReferencePhoto(item.file)))
        referenceImages = urls
      }

      const res = await fetch('/api/custom-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name || user.name,
          customerEmail: email || user.email,
          customerPhone: phone,
          productId: product?.id,
          productName: pieceName || product?.name || 'Custom furniture',
          productUrl: canonicalUrl,
          seatingCapacity: size,
          dimensions: { raw: size },
          material: look,
          color: '',
          budget,
          notes,
          referenceImages,
        }),
      })
      if (res.status === 401) {
        setStatusMsg('Please sign in to submit your custom request.')
        openAuth('signin')
        return
      }
      if (!res.ok) {
        throw new Error('Request failed')
      }

      const payload = (await res.json()) as { request?: { id?: string } }
      clearFormFields()
      setSubmittedId(payload.request?.id || '')
      setSubmitOk(true)
      setStatusMsg('Our atelier will review your brief and contact you by phone or email.')
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH') {
        setStatusMsg('Please sign in to upload photos and submit.')
        openAuth('signin')
      } else if (err instanceof Error && err.message) {
        setStatusMsg(err.message)
      } else {
        setStatusMsg('Something went wrong. Please try again in a moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="custom-request-backdrop" onClick={handleClose}>
      <div
        className={`custom-request-panel${submitOk ? ' custom-request-panel--success' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-request-title"
      >
        <button type="button" onClick={handleClose} className="custom-request-close" aria-label="Close">
          ✕
        </button>

        {submitOk ? (
          <div className="custom-request-success">
            <div className="custom-request-success-icon" aria-hidden>
              ✓
            </div>
            <p className="custom-request-eyebrow">Custom order</p>
            <h2 id="custom-request-title" className="custom-request-success-title">
              Request received
            </h2>
            <p className="custom-request-success-body">{statusMsg}</p>
            {submittedId ? (
              <p className="custom-request-success-ref">
                Reference <strong>{submittedId}</strong>
              </p>
            ) : null}
            <div className="custom-request-success-actions">
              <button type="button" className="custom-request-btn primary" onClick={handleClose}>
                Done
              </button>
              <button
                type="button"
                className="custom-request-btn secondary"
                onClick={() => {
                  resetForm()
                }}
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="custom-request-header">
              <p className="custom-request-eyebrow">Custom order</p>
              <h2 id="custom-request-title" className="custom-request-title">
                Request a custom quote
              </h2>
              <p className="custom-request-lead">
                Share your brief and reference photos. We save everything to your enquiry — our team follows up personally; no payment on this step.
              </p>
            </div>

            {statusMsg && !submitOk ? (
              <div className="custom-request-alert" role="status">
                {statusMsg}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="custom-request-form">
              <div>
                <label style={fieldLabel}>What do you want?</label>
                <input
                  type="text"
                  value={pieceName}
                  onChange={(e) => setPieceName(e.target.value)}
                  placeholder="e.g. Dining table, 3-seater sofa"
                  style={fieldInput}
                />
              </div>

              <div className="custom-request-form-row">
                <div>
                  <label style={fieldLabel}>Your name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>Phone number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    required
                    style={fieldInput}
                  />
                </div>
              </div>

              <div>
                <label style={fieldLabel}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>Size</label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 3-seater, or 200 cm wide × 90 cm deep"
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>Wood, fabric &amp; colour</label>
                <input
                  type="text"
                  value={look}
                  onChange={(e) => setLook(e.target.value)}
                  placeholder="e.g. Teak wood, beige linen"
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>Budget (optional)</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. ₹75,000 – ₹1,50,000"
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>Reference photos (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleImagePick(e.target.files)
                    e.target.value = ''
                  }}
                  style={{ ...fieldInput, height: 'auto', padding: 8 }}
                />
                <p className="custom-request-upload-hint">Up to {MAX_IMAGES} images, 2.5 MB each — stored securely, not as embedded data.</p>
                {imageError ? <p className="custom-request-field-error">{imageError}</p> : null}
                {pendingImages.length > 0 ? (
                  <div className="custom-request-thumbs">
                    {pendingImages.map((item) => (
                      <div key={item.id} className="custom-request-thumb">
                        <img src={item.preview} alt="" />
                        <button type="button" aria-label="Remove image" onClick={() => removePendingImage(item.id)}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label style={fieldLabel}>Anything else? (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Room photos, delivery date, lift size, etc."
                  style={{
                    ...fieldInput,
                    height: 'auto',
                    padding: 10,
                    resize: 'none',
                  }}
                />
              </div>

              <button type="submit" disabled={loading} className="custom-request-btn primary custom-request-submit">
                {loading ? 'Submitting…' : user ? 'Submit custom request' : 'Sign in & submit'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}