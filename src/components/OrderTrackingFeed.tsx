import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FULFILMENT_STEPS, ordersApi, type Order } from '../lib/orders-api'
import { formatDate, formatPrice } from '../utils/format'

const stepLabel = (id: string) => FULFILMENT_STEPS.find((s) => s.id === id)?.label || id.replace(/_/g, ' ')

export function OrderTrackingFeed({ limit = 4, title = 'Tracking updates' }: { limit?: number; title?: string }) {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    void ordersApi.list().then((res) => {
      if (res.orders?.length) setOrders(res.orders.slice(0, limit))
    })
  }, [limit])

  if (!orders.length) return null

  return (
    <section className="order-tracking-feed">
      <div className="order-tracking-feed-head">
        <h3>{title}</h3>
        <Link to="/account/track">Track an order</Link>
      </div>
      <ul className="order-tracking-feed-list">
        {orders.map((order) => {
          const step = stepLabel(order.fulfilmentStatus)
          const paid = order.paymentStatus === 'paid'
          return (
            <li key={order.id}>
              <div className="order-tracking-feed-main">
                <strong>{order.number}</strong>
                <span className="order-tracking-feed-status">{step}</span>
              </div>
              <p className="form-note">
                {formatDate(order.createdAt)} · {formatPrice(order.total)} · {paid ? 'Paid' : 'Payment pending'}
              </p>
              {order.trackingNumber ? (
                <p className="form-note">Ref {order.trackingNumber}</p>
              ) : (
                <p className="form-note">Tracking reference will appear when your order ships.</p>
              )}
              <Link to={`/account/orders/${order.id}`}>View details</Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}