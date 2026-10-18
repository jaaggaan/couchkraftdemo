import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { DemoPaymentModal, type DemoMethod } from '../components/DemoPaymentModal'
import { checkoutApi } from '../lib/checkout-api'
import { addressesApi, type Address } from '../lib/orders-api'
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpay-checkout'
import { formatPrice } from '../utils/format'
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
  const { cart, coupon, cartSubtotal, cartDiscount, cartTotal, getCartProducts, clearCart } = useStore()
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
  const [demoOpen, setDemoOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const paymentSettled = useRef(false)

  useEffect(() => {
    if (!loading && !user) openAuth('signin')
  }, [loading, user, openAuth])

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

  const pay = async () => {
    if (!validate() || busy) return
    paymentSettled.current = false
    setBusy(true)
    setFormError('')
    setStatus('Preparing your payment…')
    const session = await checkoutApi.session({
      items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, finish: item.finish, customization: item.customization })),
      coupon,
      addressId: addressId || undefined,
      name,
      phone,
      ...form,
    })
    if (session.alreadyPaid && session.order) {
      clearCart()
      navigate(`/order/confirmation/${session.order.id}`)
      return
    }
    if (session.status >= 400 || !session.order || !session.razorpayOrderId) {
      setBusy(false)
      setStatus('')
      setFormError(session.error || 'Checkout could not be started.')
      return
    }
    if (session.gateway === 'demo' || !session.keyId) {
      setPendingOrder(session.order)
      setDemoOpen(true)
      setBusy(false)
      setStatus('')
      return
    }
    try {
      await loadRazorpayScript()
    } catch (error) {
      setBusy(false)
      setStatus('')
      setFormError(error instanceof Error ? error.message : 'Razorpay Checkout could not be loaded.')
      return
    }
    setStatus('Waiting for Razorpay Checkout…')
    const orderId = session.order.id
    const checkout = openRazorpayCheckout({
      key: session.keyId,
      amount: session.amount || session.order.total * 100,
      currency: session.currency || 'INR',
      name: 'CouchKraft',
      description: `Order ${session.order.number} (Test Mode)`,
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
          setFormError('Checkout was closed before payment finished. This order is still pending and has not been marked paid.')
        },
      },
      handler: (response) => {
        paymentSettled.current = true
        setStatus('Verifying payment on the server…')
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
              navigate(`/order/confirmation/${result.order.id}`)
              return
            }
            setBusy(false)
            setStatus('')
            setFormError(result.error || 'Payment was not verified. This order has not been marked as paid.')
          })
      },
    })
    checkout.on('payment.failed', (response) => {
      paymentSettled.current = true
      setBusy(false)
      setStatus('')
      const reason = response.error.description || 'The test payment failed.'
      setFormError(reason)
      void checkoutApi.fail(orderId, reason)
    })
    checkout.open()
  }

  const finishDemoPay = async (method: DemoMethod, action: 'success' | 'fail') => {
    if (!pendingOrder || busy) return
    setBusy(true)
    setFormError('')
    const result = await checkoutApi.demoPay({ orderId: pendingOrder.id, method, action })
    setBusy(false)
    if (result.order && !result.failed && result.order.paymentStatus !== 'failed') {
      clearCart()
      setDemoOpen(false)
      navigate(`/order/confirmation/${result.order.id}`)
      return
    }
    setFormError(result.error || 'Demo payment failed. You can retry from checkout.')
  }

  return (
    <main id="main" className="page-wrap checkout-page">
      <p className="form-note">Demo payment gateway · no live charges</p>
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
          <button className="btn checkout-pay" type="button" disabled={busy} onClick={() => void pay()}>
            {busy ? 'Please wait…' : `Pay Securely · ${formatPrice(cartTotal)}`}
          </button>
          <p className="form-note">Card, UPI, net banking or cash. This is a local demo gateway until Razorpay test keys are added.</p>
        </section>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <ul className="checkout-lines">
            {lines.map(({ product, quantity, finish, customization, unitPrice }: any) => (
              <li key={product.id + (finish || '') + JSON.stringify(customization || {})}>
                <img src={product.images[0]} alt="" />
                <div>
                  <strong>{product.name}</strong>
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
      {demoOpen && pendingOrder ? (
        <DemoPaymentModal
          amount={pendingOrder.total}
          orderNumber={pendingOrder.number}
          busy={busy}
          onClose={() => {
            setDemoOpen(false)
            setFormError('Checkout was closed before payment finished. This order is still pending.')
          }}
          onPay={(method, action) => void finishDemoPay(method, action)}
        />
      ) : null}
    </main>
  )
}
