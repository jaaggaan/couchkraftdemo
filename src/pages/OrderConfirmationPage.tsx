import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ordersApi, type Order } from '../lib/orders-api'
import { formatPrice } from '../utils/format'

function isConfirmed(order: Order) {
  if (order.paymentStatus === 'failed') return false
  if (order.paymentStatus === 'paid') return true
  return order.paymentMethod === 'cash' && Boolean(order.trackingNumber)
}

export function OrderConfirmationPage() {
  const { orderId = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    void ordersApi.get(orderId).then((result) => {
      if (result.status >= 400) setError(result.error || 'Unable to load this order.')
      else setOrder(result.order)
    })
  }

  useEffect(load, [orderId])

  if (error) {
    return (
      <main id="main" className="page-wrap confirm-page">
        <h1>Order</h1>
        <p className="auth-error">{error}</p>
        <button type="button" className="btn" onClick={load}>
          Retry
        </button>
      </main>
    )
  }

  if (!order) {
    return (
      <main id="main" className="page-wrap confirm-page">
        <p className="form-note">Loading your order…</p>
      </main>
    )
  }

  const confirmed = isConfirmed(order)

  return (
    <main id="main" className="page-wrap confirm-page">
      <p className="form-note">{confirmed ? 'Order confirmed' : `Payment ${order.paymentStatus}`}</p>
      <h1>{confirmed ? 'Thank you for your order' : 'Payment is not complete'}</h1>
      <p className="confirm-number">{order.number}</p>

      {confirmed && order.trackingNumber ? (
        <div className="confirm-track">
          <p className="form-note">Tracking ID</p>
          <p className="confirm-track-id">{order.trackingNumber}</p>
          <p className="form-note">Internal CouchKraft reference. Live courier tracking is not connected.</p>
        </div>
      ) : null}

      {confirmed ? (
        <p>
          {order.paymentStatus === 'paid'
            ? `Payment received by ${order.deliveryMethod || 'demo gateway'}.`
            : 'Cash on delivery selected. Pay when the order arrives.'}
        </p>
      ) : (
        <p className="auth-error">
          This page does not confirm a successful payment. Current status: {order.paymentStatus}.
          {order.paymentError ? ` ${order.paymentError}` : ''}
        </p>
      )}

      <ul className="order-items">
        {order.items.map((item) => (
          <li key={item.productId + item.finish}>
            <img src={item.image} alt="" />
            <div>
              <strong>{item.name}</strong>
              <p className="form-note">
                {item.finish} · Qty {item.quantity}
              </p>
              {item.customization && (
                <p className="form-note" style={{ color: '#835022', fontSize: 11, marginTop: 2 }}>
                  {[
                    item.customization.seating,
                    item.customization.width ? `${item.customization.width}×${item.customization.depth}×${item.customization.height}${item.customization.dimensionUnit || 'cm'}` : null,
                    item.customization.fabric,
                    item.customization.color,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p>
        <strong>Total {formatPrice(order.total)}</strong>
      </p>
      {order.shippingAddress ? (
        <p>
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
        </p>
      ) : null}

      <div className="account-actions">
        {confirmed ? (
          <Link className="btn" to={`/account/track?number=${order.number}`}>
            Track My Order
          </Link>
        ) : (
          <Link className="btn" to="/checkout">
            Retry payment
          </Link>
        )}
        <Link to="/shop">Continue Shopping</Link>
      </div>
    </main>
  )
}
