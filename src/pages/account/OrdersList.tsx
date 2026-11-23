import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi, type Order } from '../../lib/orders-api'
import { formatDate, formatPrice } from '../../utils/format'
import { OrderTrackingFeed } from '../../components/OrderTrackingFeed'

function paymentLabel(order: Order) {
  if (order.paymentMethod === 'cash') return 'Cash on delivery'
  if (order.paymentStatus === 'paid') return 'Paid'
  if (order.paymentStatus === 'failed') return 'Failed'
  if (order.paymentStatus === 'refunded') return 'Refunded'
  return 'Pending'
}

function fulfilmentLabel(status: Order['fulfilmentStatus']) {
  return status.replace(/_/g, ' ')
}

export function OrdersList() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    setOrders(null)
    void ordersApi.list().then((result) => {
      if (result.status >= 400) setError(result.error || 'Unable to load orders.')
      else setOrders(result.orders)
    })
  }

  useEffect(load, [])

  if (error) {
    return (
      <div>
        <h2>My orders</h2>
        <p className="auth-error">{error}</p>
        <button type="button" className="btn" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  if (!orders) {
    return (
      <div>
        <h2>My orders</h2>
        <p className="form-note">Loading your orders…</p>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="account-empty">
        <h2>My orders</h2>
        <p>
          No orders are linked to this account yet. Checkout while signed in (same email as your profile) so orders appear here.
          Older guest checkouts may not show until they match your account email in our system.
        </p>
        <Link className="btn" to="/shop">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <OrderTrackingFeed />
      <h2>My orders</h2>
      <ul className="order-list">
        {orders.map((order) => (
          <li key={order.id} className="order-card">
            <div className="order-card-top">
              <div>
                <strong>{order.number}</strong>
                <p className="form-note">{formatDate(order.createdAt)}</p>
              </div>
              <div className="order-card-status">
                <span>{paymentLabel(order)}</span>
                <span>{fulfilmentLabel(order.fulfilmentStatus)}</span>
              </div>
            </div>
            <div className="order-thumbs">
              {order.items.map((item) => (
                <img key={item.productId + item.finish} src={item.image} alt={item.name} />
              ))}
            </div>
            <p className="form-note">
              {order.items.map((item) => `${item.name} × ${item.quantity}`).join(' · ')}
            </p>
            <strong>{formatPrice(order.total)}</strong>
            <div className="account-actions">
              <Link to={`/account/orders/${order.id}`}>View order</Link>
              <Link to={`/account/track?number=${order.number}`}>Track order</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
