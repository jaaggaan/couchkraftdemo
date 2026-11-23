import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PaymentGatewayPanel } from './PaymentGatewayPanel'
import type { DemoMethod } from './DemoPaymentModal'
import { checkoutApi } from '../lib/checkout-api'
import { customRequestsApi, type CustomRequest } from '../lib/custom-requests-api'
import type { Order } from '../lib/orders-api'
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpay-checkout'
import { formatPrice } from '../utils/format'

type Props = {
  request: CustomRequest
  onPaid?: () => void
}

export function CustomRequestPayment({ request, onPaid }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const [gateway, setGateway] = useState<'demo' | 'razorpay'>('demo')
  const [razorpaySession, setRazorpaySession] = useState<{
    keyId: string
    razorpayOrderId: string
    amount: number
    currency: string
  } | null>(null)
  const [upiVpa, setUpiVpa] = useState('couchkraft.demo@oksbi')
  const [payeeName, setPayeeName] = useState('CouchKraft')
  const [panelMessage, setPanelMessage] = useState('')
  const settled = useRef(false)

  useEffect(() => {
    void checkoutApi.config().then((cfg) => {
      if (cfg.gateway) setGateway(cfg.gateway)
      if (cfg.upiVpa) setUpiVpa(cfg.upiVpa)
      if (cfg.payeeName) setPayeeName(cfg.payeeName)
    })
  }, [])

  if (request.status !== 'approved') return null

  const quote = Number(request.quoteAmount)
  const paid = request.paymentStatus === 'paid'

  const startPayment = async () => {
    if (busy || paid || !user) return
    setBusy(true)
    setError('')
    const session = await customRequestsApi.paymentSession(request.id)
    setBusy(false)
    if (session.alreadyPaid) {
      onPaid?.()
      return
    }
    if (session.status >= 400 || !session.order || !session.razorpayOrderId) {
      setError(session.error || 'Could not start payment.')
      return
    }
    settled.current = false
    setGateway(session.gateway === 'razorpay' && session.keyId ? 'razorpay' : 'demo')
    setPendingOrder(session.order)
    if (session.gateway === 'razorpay' && session.keyId) {
      setRazorpaySession({
        keyId: session.keyId,
        razorpayOrderId: session.razorpayOrderId,
        amount: session.amount || session.order.total * 100,
        currency: session.currency || 'INR',
      })
    } else {
      setRazorpaySession(null)
    }
    setPanelMessage('')
    setPaymentOpen(true)
  }

  const finishDemoPay = async (method: DemoMethod, action: 'success' | 'fail') => {
    if (!pendingOrder || busy) return
    setBusy(true)
    const result = await checkoutApi.demoPay({ orderId: pendingOrder.id, method, action })
    setBusy(false)
    if (result.order && !result.failed && result.order.paymentStatus !== 'failed') {
      setPaymentOpen(false)
      onPaid?.()
      navigate(`/order/confirmation/${result.order.id}`)
      return
    }
    setPanelMessage(result.error || 'Payment could not be confirmed.')
  }

  const openRazorpay = async () => {
    if (!pendingOrder || !razorpaySession || busy) return
    setBusy(true)
    try {
      await loadRazorpayScript()
    } catch {
      setBusy(false)
      setError('Razorpay could not load.')
      return
    }
    const checkout = openRazorpayCheckout({
      key: razorpaySession.keyId,
      amount: razorpaySession.amount || pendingOrder.total * 100,
      currency: razorpaySession.currency || 'INR',
      name: 'CouchKraft',
      description: `Bespoke commission ${request.id}`,
      order_id: razorpaySession.razorpayOrderId,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: (user?.phone || request.customerPhone).replace(/\s/g, ''),
      },
      notes: { couchkraftOrderId: pendingOrder.id, customRequestId: request.id },
      theme: { color: '#78634e' },
      modal: {
        ondismiss: () => {
          if (settled.current) return
          setBusy(false)
          setError('Payment was not completed. You can try again.')
        },
      },
      handler: (response) => {
        if (settled.current) return
        settled.current = true
        void checkoutApi
          .verify({
            orderId: pendingOrder.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          .then((result) => {
            setBusy(false)
            if (result.order?.paymentStatus === 'paid') {
              setPaymentOpen(false)
              onPaid?.()
              navigate(`/order/confirmation/${result.order.id}`)
            } else {
              setError(result.error || 'Payment verification failed.')
            }
          })
      },
    })
    checkout.on('payment.failed', (response) => {
      settled.current = true
      setBusy(false)
      setError(response.error.description || 'Payment failed.')
      void checkoutApi.fail(pendingOrder.id, response.error.description || 'Payment failed.')
    })
    checkout.open()
    setBusy(false)
  }

  if (paid) {
    return (
      <div className="custom-request-payment custom-request-payment--paid">
        <p className="form-note">Commission paid — our atelier will confirm production dates shortly.</p>
        {request.linkedOrderId ? (
          <Link to={`/account/orders/${request.linkedOrderId}`} className="btn btn-ghost btn-small">
            View order
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="custom-request-payment">
      <h3 className="custom-request-payment-title">Commission payment</h3>
      {quote > 0 ? (
        <p className="custom-request-payment-amount">
          Amount due: <strong>{formatPrice(quote)}</strong>
        </p>
      ) : (
        <p className="form-note">Your atelier quote is being finalized — check back soon or refresh after we email you.</p>
      )}
      {error ? <p className="auth-error">{error}</p> : null}
      {quote > 0 ? (
        <button type="button" className="btn" disabled={busy} onClick={() => void startPayment()}>
          {busy ? 'Preparing…' : 'Pay commission'}
        </button>
      ) : null}

      {paymentOpen && pendingOrder ? (
        <PaymentGatewayPanel
          order={pendingOrder}
          amount={pendingOrder.total}
          customerPhone={user?.phone || request.customerPhone}
          customerEmail={user?.email || ''}
          customerName={user?.name || request.customerName}
          gateway={gateway}
          upiVpa={upiVpa}
          payeeName={payeeName}
          busy={busy}
          onClose={() => {
            setPaymentOpen(false)
            setPendingOrder(null)
          }}
          onDemoPay={(method, action) => void finishDemoPay(method, action)}
          onRazorpayPay={() => void openRazorpay()}
          serverMessage={panelMessage}
        />
      ) : null}
    </div>
  )
}