import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FULFILMENT_STEPS, ordersApi, type Order } from '../../lib/orders-api'
import { formatDate, formatPrice } from '../../utils/format'

export function OrderDetail() {
  const { orderId = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    setOrder(null)
    void ordersApi.get(orderId).then((result) => {
      if (result.status >= 400) setError(result.error || 'Unable to load this order.')
      else setOrder(result.order)
    })
  }

  useEffect(load, [orderId])

  if (error) {
    return (
      <div>
        <h2>Order</h2>
        <p className="auth-error">{error}</p>
        <button type="button" className="btn" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  if (!order) return <p className="form-note">Loading order…</p>

  const current = FULFILMENT_STEPS.findIndex((step) => step.id === order.fulfilmentStatus)

  return (
    <div>
      <p className="form-note">
        <Link to="/account/orders">My orders</Link>
      </p>
      <h2>{order.number}</h2>
      <p className="form-note">{formatDate(order.createdAt)}</p>

      <ol className="order-timeline">
        {FULFILMENT_STEPS.map((step, index) => (
          <li key={step.id} className={index <= current ? 'is-done' : undefined}>
            <span />
            {step.label}
          </li>
        ))}
      </ol>

      <h3>Items</h3>
      <ul className="order-items">
        {order.items.map((item) => (
          <li key={item.productId + item.finish}>
            <img src={item.image} alt="" />
            <div>
              <Link to={`/product/${item.slug}`}>{item.name}</Link>
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
            <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
          </li>
        ))}
      </ul>

      <h3>Payment</h3>
      <p>
        Subtotal {formatPrice(order.subtotal)}
        {order.discount ? ` · Discount ${formatPrice(order.discount)}` : ''}
      </p>
      <p>
        <strong>Total {formatPrice(order.total)}</strong>
      </p>
      <p className="form-note">
        {order.paymentStatus === 'paid'
          ? `Paid${order.deliveryMethod ? ` · ${order.deliveryMethod}` : ''}.`
          : order.paymentMethod === 'cash'
            ? 'Cash on delivery. Pay when the order arrives.'
            : order.paymentStatus === 'failed'
              ? `Payment failed${order.paymentError ? `: ${order.paymentError}` : ''}.`
              : 'Payment is pending.'}
      </p>
      {order.razorpayPaymentId ? <p className="form-note">Razorpay payment {order.razorpayPaymentId}</p> : null}

      <h3>Shipping</h3>
      {order.shippingAddress ? (
        <p>
          {order.shippingAddress.label}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
          <br />
          {order.shippingAddress.country}
        </p>
      ) : (
        <p className="form-note">No shipping address was saved on this order.</p>
      )}
      <p className="form-note">{order.deliveryMethod || 'Delivery method has not been assigned.'}</p>
      <p className="form-note">
        {order.trackingNumber
          ? `Tracking ID ${order.trackingNumber} (CouchKraft reference, not live courier tracking).`
          : 'No tracking ID has been issued yet. Live courier tracking is not connected.'}
      </p>
      {order.estimatedDelivery ? <p>Estimated delivery {formatDate(order.estimatedDelivery)}</p> : null}

      <Link to={`/account/track?number=${order.number}`}>Track this order</Link>
    </div>
  )
}
