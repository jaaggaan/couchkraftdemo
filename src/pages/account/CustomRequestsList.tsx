import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CUSTOM_REQUEST_STATUS_LABEL,
  customRequestsApi,
  referenceImagesFor,
  type CustomRequest,
} from '../../lib/custom-requests-api'
import { formatDate, formatPrice } from '../../utils/format'
import { CustomRequestPayment } from '../../components/CustomRequestPayment'
import { PAYMENT_STATUS_LABEL } from '../../lib/custom-requests-api'

export function CustomRequestsList() {
  const [requests, setRequests] = useState<CustomRequest[] | null>(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError('')
    setRequests(null)
    void customRequestsApi.list().then((result) => {
      if (result.status >= 400) setError(result.error || 'Unable to load your custom requests.')
      else setRequests(result.requests || [])
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  if (error) {
    return (
      <div>
        <h2>My custom requests</h2>
        <p className="auth-error">{error}</p>
        <button type="button" className="btn" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  if (!requests) {
    return (
      <div>
        <h2>My custom requests</h2>
        <p className="form-note">Loading your submissions…</p>
      </div>
    )
  }

  if (!requests.length) {
    return (
      <div className="account-empty">
        <h2>My custom requests</h2>
        <p>
          Bespoke quote forms you submit while signed in appear here, including photos and status updates from our atelier.
        </p>
        <Link className="btn" to="/">
          Explore custom options
        </Link>
      </div>
    )
  }

  return (
    <div className="account-custom-requests">
      <div className="account-custom-requests-head">
        <div>
          <h2>My custom requests</h2>
          <p className="form-note">Status updates from the atelier team sync when you refresh or return to this page.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={load}>
          Refresh
        </button>
      </div>

      <ul className="custom-request-account-list">
        {requests.map((req) => {
          const images = referenceImagesFor(req)
          const statusLabel = CUSTOM_REQUEST_STATUS_LABEL[req.status] || req.status
          return (
            <li key={req.id} className="custom-request-account-card">
              <button
                type="button"
                className="custom-request-account-card-main"
                onClick={() => setOpenId((current) => (current === req.id ? null : req.id))}
                aria-expanded={openId === req.id}
              >
                <div>
                  <strong>{req.productName || 'Custom furniture'}</strong>
                  <p className="form-note">
                    {req.id} · {formatDate(req.createdAt)}
                  </p>
                </div>
                <span className={`custom-request-status-pill status-${req.status}`}>{statusLabel}</span>
              </button>
              {images[0] ? <ReferenceThumbs images={images} /> : null}
              {openId === req.id ? (
                <CustomRequestDetailBody req={req} images={images} onRefresh={load} />
              ) : null}
            </li>
          )
        })}
      </ul>

    </div>
  )
}

function ReferenceThumbs({ images }: { images: string[] }) {
  return (
    <div className="custom-request-account-thumbs" aria-hidden={images.length === 0}>
      {images.slice(0, 4).map((src) => (
        <img key={src} src={src} alt="" />
      ))}
    </div>
  )
}

function CustomRequestDetailBody({
  req,
  images,
  onRefresh,
}: {
  req: CustomRequest
  images: string[]
  onRefresh: () => void
}) {
  const statusLabel = CUSTOM_REQUEST_STATUS_LABEL[req.status] || req.status
  const payStatus = req.paymentStatus || 'none'
  return (
    <div className="custom-request-account-detail">
      <dl className="account-dl">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`custom-request-status-pill status-${req.status}`}>{statusLabel}</span>
            {req.updatedAt !== req.createdAt ? (
              <span className="form-note"> Updated {formatDate(req.updatedAt)}</span>
            ) : null}
          </dd>
        </div>
        {req.status === 'approved' ? (
          <>
            {req.quoteAmount != null && Number(req.quoteAmount) > 0 ? (
              <div>
                <dt>Quote</dt>
                <dd>{formatPrice(Number(req.quoteAmount))}</dd>
              </div>
            ) : null}
            <div>
              <dt>Payment</dt>
              <dd>
                <span className={`custom-request-pay-pill pay-${payStatus}`}>
                  {PAYMENT_STATUS_LABEL[payStatus]}
                </span>
              </dd>
            </div>
          </>
        ) : null}
        {req.seatingCapacity || req.dimensions?.raw ? (
          <div>
            <dt>Size</dt>
            <dd>{req.seatingCapacity || req.dimensions?.raw}</dd>
          </div>
        ) : null}
        {req.material ? (
          <div>
            <dt>Materials &amp; finish</dt>
            <dd>{req.material}</dd>
          </div>
        ) : null}
        {req.budget ? (
          <div>
            <dt>Budget</dt>
            <dd>{req.budget}</dd>
          </div>
        ) : null}
        {req.notes ? (
          <div>
            <dt>Your notes</dt>
            <dd>{req.notes}</dd>
          </div>
        ) : null}
        {req.adminNotes?.trim() ? (
          <div>
            <dt>Message from atelier</dt>
            <dd className="custom-request-atelier-note">{req.adminNotes}</dd>
          </div>
        ) : null}
      </dl>
      {images.length > 0 ? (
        <div>
          <p className="form-note" style={{ marginBottom: 8 }}>
            Reference photos
          </p>
          <div className="custom-request-account-thumbs custom-request-account-thumbs--detail">
            {images.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer">
                <img src={src} alt="" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {req.status === 'approved' ? <CustomRequestPayment request={req} onPaid={onRefresh} /> : null}

      {req.productUrl ? (
        <a href={req.productUrl} className="link-btn">
          View related product
        </a>
      ) : null}
    </div>
  )
}