import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { PaymentGatewayPanel } from '../components/PaymentGatewayPanel'
import type { DemoMethod } from '../components/DemoPaymentModal'
import { validateCartStock } from '../lib/cart-api'
import { checkoutApi } from '../lib/checkout-api'
import { addressesApi, type Address } from '../lib/orders-api'
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpay-checkout'
import { formatPrice } from '../utils/format'
import { CartLineDiscountNote } from '../components/ProductExtraDiscount'
import type { Order } from '../lib/orders-api'

const emptyAddress = {
  label: 'Home',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'India',
}

export function CheckoutPage() {
  const { user, loading, openAuth } = useAuth()
  const { cart, coupon, cartSubtotal, cartDiscount, cartTotal, getCartProducts, clearCart, setQuantity, removeFromCart } =
    useStore()
  const navigate = useNavigate()
  const lines = getCartProducts()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState('')
  const [form, setForm] = useState(emptyAddress)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const [checkoutGateway, setCheckoutGateway] = useState<'demo' | 'razorpay'>('demo')
  const [razorpaySession, setRazorpaySession] = useState<{
    keyId: string
    razorpayOrderId: string
    amount: number
    currency: string
  } | null>(null)
  const [upiVpa, setUpiVpa] = useState('couchkraft.demo@oksbi')
  const [payeeName, setPayeeName] = useState('CouchKraft')
  const [paymentPanelMessage, setPaymentPanelMessage] = useState('')
  const paymentSettled = useRef(false)

  useEffect(() => {
    if (!loading && !user) openAuth('signin')
  }, [loading, user, openAuth])

  useEffect(() => {
    void checkoutApi.config().then((cfg) => {
      if (cfg.gateway) setCheckoutGateway(cfg.gateway)
      if (cfg.upiVpa) setUpiVpa(cfg.upiVpa)
      if (cfg.payeeName) setPayeeName(cfg.payeeName)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setPhone(user.phone)
    void addressesApi.list().then((result) => {
      if (result.addresses?.length) {
        setAddresses(result.addresses)
        setAddressId(result.addresses[0].id)
        const first = result.addresses[0]
        setForm({
          label: first.label,
          line1: first.line1,
          line2: first.line2,
          city: first.city,
          region: first.region,
          postalCode: first.postalCode,
          country: first.country,
        })
      }
    })
  }, [user])

  if (loading) {
    return (
      <main id="main" className="page-wrap checkout-page">
        <p className="form-note">Checking your session…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main id="main" className="page-wrap checkout-page">
        <h1>Checkout</h1>
        <p className="form-note">Sign in to continue to payment.</p>
        <button type="button" className="btn" onClick={() => openAuth('signin')}>
          Sign in
        </button>
      </main>
    )
  }

  if (!lines.length) {
    return (
      <main id="main" className="page-wrap checkout-page">
        <h1>Checkout</h1>
        <p className="form-note">Your bag is empty.</p>
        <Link className="btn" to="/shop">
          Continue shopping
        </Link>
      </main>
    )
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = 'Enter the name for this order.'
    if (!/^[0-9+\-\s]{8,16}$/.test(phone)) next.phone = 'Enter a valid phone number.'
    if (!form.line1.trim()) next.line1 = 'Enter a delivery address.'
    if (!form.city.trim()) next.city = 'Enter a city.'
    if (!form.region.trim()) next.region = 'Enter a state or region.'
    if (!form.postalCode.trim()) next.postalCode = 'Enter a postal code.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const launchRazorpay = async (order: Order, session: NonNullable<typeof razorpaySession>) => {
    if (!user || busy) return
    paymentSettled.current = false
    setBusy(true)
    setFormError('')
    setStatus('Opening Razorpay…')
    try {
      await loadRazorpayScript()
    } catch (error) {
      setBusy(false)
      setStatus('')
      setFormError(error instanceof Error ? error.message : 'Razorpay Checkout could not be loaded.')
      return
    }
    const orderId = order.id
    const checkout = openRazorpayCheckout({
      key: session.keyId,
      amount: session.amount || order.total * 100,
      currency: session.currency || 'INR',
      name: 'CouchKraft',
      description: `Order ${order.number} (Test Mode)`,
      order_id: session.razorpayOrderId,
      prefill: {
        name,
        email: user.email,
        contact: phone.replace(/\s/g, ''),
      },
      notes: { couchkraftOrderId: orderId },
      theme: { color: '#78634e' },
      modal: {
        ondismiss: () => {
          if (paymentSettled.current) return
          setBusy(false)
          setStatus('')
          setFormError('Checkout was closed before payment finished. This order is still pending.')
        },
      },
      handler: (response) => {
        paymentSettled.current = true
        setStatus('Verifying payment…')
        void checkoutApi
          .verify({
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          .then((result) => {
            if (result.order?.paymentStatus === 'paid') {
              clearCart()
              setPaymentOpen(false)
              navigate(`/order/confirmation/${result.order.id}`)
              return
            }
            setBusy(false)
            setStatus('')
            setFormError(result.error || 'Payment was not verified.')
          })
      },
    })
    checkout.on('payment.failed', (response) => {
      paymentSettled.current = true
      setBusy(false)
      setStatus('')
      const reason = response.error.description || 'The payment failed.'
      setFormError(reason)
      void checkoutApi.fail(orderId, reason)
    })
    checkout.open()
  }

  const continueToPayment = async () => {
    if (!validate() || busy || !user) return
    paymentSettled.current = false
    setBusy(true)
    setFormError('')
    const stock = await validateCartStock(cart.map((item) => ({ productId: item.productId, quantity: item.quantity })))
    if (!stock.ok) {
      setBusy(false)
      const issue = stock.issues[0]
      if (issue?.reason === 'insufficient_stock' && issue.available > 0) {
        const line = cart.find((i) => i.productId === issue.productId)
        if (line) setQuantity(issue.productId, issue.available, line.customization)
        setFormError(`Only ${issue.available} left for "${issue.productName}". Your bag was updated — try again.`)
      } else if (issue) {
        const line = cart.find((i) => i.productId === issue.productId)
        if (line) removeFromCart(issue.productId, line.finish, line.customization)
        setFormError(stock.message || `Removed "${issue.productName}" — not enough stock.`)
      } else {
        setFormError(stock.message || 'Please check your bag and try again.')
      }
      return
    }
    setStatus('Creating your order…')
    const session = await checkoutApi.session({
      items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, finish: item.finish, customization: item.customization })),
      coupon,
      addressId: addressId || undefined,
      name,
      phone,
      ...form,
    })
    setBusy(false)
    setStatus('')
    if (session.alreadyPaid && session.order) {
      clearCart()
      navigate(`/order/confirmation/${session.order.id}`)
      return
    }
    if (session.status >= 400 || !session.order || !session.razorpayOrderId) {
      if (session.code === 'insufficient_stock' && session.productId && session.availableStock != null) {
        const line = cart.find((i) => i.productId === session.productId)
        if (session.availableStock > 0 && line) {
          setQuantity(session.productId, session.availableStock, line.customization)
        } else if (line) {
          removeFromCart(session.productId, line.finish, line.customization)
        }
      }
      setFormError(session.error || 'Checkout could not be started.')
      return
    }
    setCheckoutGateway(session.gateway === 'razorpay' && session.keyId ? 'razorpay' : 'demo')
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
    setPaymentPanelMessage('')
    setPaymentOpen(true)
  }

  const finishDemoPay = async (method: DemoMethod, action: 'success' | 'fail') => {
    if (!pendingOrder || busy) return
    setBusy(true)
    setFormError('')
    setPaymentPanelMessage('')
    const result = await checkoutApi.demoPay({ orderId: pendingOrder.id, method, action })
    setBusy(false)
    if (result.order && !result.failed && result.order.paymentStatus !== 'failed') {
      clearCart()
      setPaymentOpen(false)
      setPaymentPanelMessage('')
      navigate(`/order/confirmation/${result.order.id}`)
      return
    }
    if (result.failed) {
      setPaymentPanelMessage('That was only a test failure. Use “Confirm payment” above to finish your order.')
      if (result.order) setPendingOrder(result.order)
      return
    }
    const message = result.error || 'Payment could not be confirmed. Try again or close and continue to payment once more.'
    setPaymentPanelMessage(message)
    setFormError(message)
  }

  return (
    <main id="main" className="page-wrap checkout-page">
      <p className="form-note">YouPI-style secure checkout · UPI QR, apps, card, or COD</p>
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <section className="checkout-main">
          <h2>Contact</h2>
          <label className="auth-field">
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            {errors.name ? <span className="auth-error">{errors.name}</span> : null}
          </label>
          <label className="auth-field">
            Email
            <input value={user.email} readOnly />
          </label>
          <label className="auth-field">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
            {errors.phone ? <span className="auth-error">{errors.phone}</span> : null}
          </label>

          <h2>Delivery address</h2>
          {addresses.length ? (
            <label className="auth-field">
              Saved address
              <select
                value={addressId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setAddressId(nextId)
                  const match = addresses.find((entry) => entry.id === nextId)
                  if (match) {
                    setForm({
                      label: match.label,
                      line1: match.line1,
                      line2: match.line2,
                      city: match.city,
                      region: match.region,
                      postalCode: match.postalCode,
                      country: match.country,
                    })
                  }
                }}
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} — {address.line1}, {address.city}
                  </option>
                ))}
                <option value="">New address</option>
              </select>
            </label>
          ) : null}
          <label className="auth-field">
            Address
            <input value={form.line1} onChange={(event) => setForm((current) => ({ ...current, line1: event.target.value }))} />
            {errors.line1 ? <span className="auth-error">{errors.line1}</span> : null}
          </label>
          <label className="auth-field">
            Apartment, landmark <em>(optional)</em>
            <input value={form.line2} onChange={(event) => setForm((current) => ({ ...current, line2: event.target.value }))} />
          </label>
          <div className="checkout-split">
            <label className="auth-field">
              City
              <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
              {errors.city ? <span className="auth-error">{errors.city}</span> : null}
            </label>
            <label className="auth-field">
              State
              <input value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
              {errors.region ? <span className="auth-error">{errors.region}</span> : null}
            </label>
          </div>
          <div className="checkout-split">
            <label className="auth-field">
              Postal code
              <input
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
              />
              {errors.postalCode ? <span className="auth-error">{errors.postalCode}</span> : null}
            </label>
            <label className="auth-field">
              Country
              <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
            </label>
          </div>
          {formError ? <p className="auth-error">{formError}</p> : null}
          {status ? <p className="form-note">{status}</p> : null}
          <button className="btn checkout-pay" type="button" disabled={busy} onClick={() => void continueToPayment()}>
            {busy ? 'Please wait…' : `Continue to payment · ${formatPrice(cartTotal)}`}
          </button>
          <p className="form-note">After you continue, you’ll verify your phone and pick UPI, card, net banking, or cash on delivery.</p>
        </section>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <ul className="checkout-lines">
            {lines.map(({ product, quantity, finish, customization, unitPrice }: any) => (
              <li key={product.id + (finish || '') + JSON.stringify(customization || {})}>
                <img src={product.images[0]} alt="" />
                <div>
                  <strong>{product.name}</strong>
                  <CartLineDiscountNote product={product} />
                  <p className="form-note">
                    {finish} · Qty {quantity}
                  </p>
                  {customization && (
                    <p className="form-note" style={{ color: '#835022', fontSize: 11, marginTop: 2 }}>
                      {[
                        customization.seating,
                        customization.width ? `${customization.width}×${customization.depth}×${customization.height}${customization.dimensionUnit || 'cm'}` : null,
                        customization.fabric,
                        customization.color,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <span>{formatPrice((unitPrice || product.price) * quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="checkout-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(cartSubtotal)}</dd>
            </div>
            {cartDiscount ? (
              <div>
                <dt>Demonstration discount ({coupon})</dt>
                <dd>−{formatPrice(cartDiscount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Delivery</dt>
              <dd>Not charged</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>Not configured</dd>
            </div>
            <div className="is-total">
              <dt>Total</dt>
              <dd>{formatPrice(cartTotal)}</dd>
            </div>
          </dl>
          <p className="form-note">
            No delivery tariff or tax rate is configured in this project, so they are not added to the payable amount.
          </p>
        </aside>
      </div>
      {paymentOpen && pendingOrder && user ? (
        <PaymentGatewayPanel
          order={pendingOrder}
          amount={pendingOrder.total}
          customerPhone={phone}
          customerEmail={user.email}
          customerName={name}
          gateway={checkoutGateway}
          upiVpa={upiVpa}
          payeeName={payeeName}
          busy={busy}
          onClose={() => {
            setPaymentOpen(false)
            setFormError('Payment was not completed. Your order is still pending.')
          }}
          onDemoPay={(method, action) => void finishDemoPay(method, action)}
          onRazorpayPay={() => {
            if (pendingOrder && razorpaySession) void launchRazorpay(pendingOrder, razorpaySession)
          }}
          serverMessage={paymentPanelMessage}
        />
      ) : null}
    </main>
  )
}
