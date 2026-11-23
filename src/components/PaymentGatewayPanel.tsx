import { useEffect, useMemo, useState } from 'react'
import type { Order } from '../lib/orders-api'
import type { DemoMethod } from './DemoPaymentModal'
import { formatPrice } from '../utils/format'
import { CloseIcon } from './Icons'
import { buildUpiIntentUri, buildUpiUri, isValidVpa, qrImageUrl, UPI_APP_LINKS } from '../lib/upi-pay'

type Props = {
  order: Order
  amount: number
  customerPhone: string
  customerEmail: string
  customerName: string
  gateway: 'demo' | 'razorpay'
  upiVpa: string
  payeeName: string
  busy: boolean
  onClose: () => void
  onDemoPay: (method: DemoMethod, action: 'success' | 'fail') => void
  onRazorpayPay: () => void
  serverMessage?: string
}

type Method = 'upi' | 'card' | 'netbanking' | 'cash'

export function PaymentGatewayPanel({
  order,
  amount,
  customerPhone,
  customerEmail,
  customerName,
  gateway,
  upiVpa,
  payeeName,
  busy,
  onClose,
  onDemoPay,
  onRazorpayPay,
  serverMessage,
}: Props) {
  const [authOk, setAuthOk] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [method, setMethod] = useState<Method>('upi')
  const [seconds, setSeconds] = useState(300)
  const [card, setCard] = useState('4111 1111 1111 1111')
  const [upiId, setUpiId] = useState('asha@okhdfcbank')
  const [bank, setBank] = useState('HDFC Bank')
  const [payError, setPayError] = useState('')

  const isMobile =
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

  useEffect(() => {
    if (!authOk) return
    const id = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [authOk])

  const upiUri = useMemo(() => {
    if (!isValidVpa(upiVpa)) return ''
    return buildUpiUri({
      payeeVpa: upiVpa,
      payeeName,
      amountInr: amount,
      transactionRef: order.number,
    })
  }, [amount, order.number, payeeName, upiVpa])

  const verifyOtp = () => {
    const code = otp.trim()
    if (code !== '1234') {
      setOtpError('Enter the demo WhatsApp code 1234.')
      return
    }
    setOtpError('')
    setAuthOk(true)
  }

  const confirmPay = (action: 'success' | 'fail' = 'success') => {
    setPayError('')
    if (gateway === 'razorpay') {
      onRazorpayPay()
      return
    }
    if (method === 'upi' && !upiId.includes('@')) {
      setPayError('Enter your UPI ID to continue.')
      return
    }
    if (method === 'card' && card.replace(/\s/g, '').length < 12) {
      setPayError('Enter a card number.')
      return
    }
    const demoMethod: DemoMethod =
      method === 'cash' ? 'cash' : method === 'netbanking' ? 'netbanking' : method === 'upi' ? 'upi' : 'card'
    onDemoPay(demoMethod, action)
  }

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="auth-backdrop ypg-backdrop" onClick={onClose}>
      <div
        className={`ypg-checkout${isMobile ? ' is-mobile' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ypg-pay-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-btn auth-close" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>

        {!authOk ? (
          <div className="ypg-auth">
            <p className="form-note">Secure checkout · inspired by YouPI-PG</p>
            <h2 id="ypg-pay-title">Verify your phone</h2>
            <p className="form-note">
              We send a quick WhatsApp code before payment (demo: use <strong>1234</strong>).
            </p>
            <label className="auth-field">
              Phone
              <input value={customerPhone} readOnly />
            </label>
            <label className="auth-field">
              4-digit code
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                placeholder="1234"
              />
              {otpError ? <span className="auth-error">{otpError}</span> : null}
            </label>
            <button type="button" className="btn checkout-pay" onClick={verifyOtp}>
              Continue to payment
            </button>
          </div>
        ) : (
          <div className="ypg-layout">
            <aside className="ypg-summary">
              <p className="ypg-brand">CouchKraft Pay</p>
              <h2 id="ypg-pay-title">Complete payment</h2>
              <p className="ypg-order-id">Order {order.number}</p>
              <p className="ypg-amount">{formatPrice(amount)}</p>
              <p className="form-note">Pay within {timerLabel}</p>
              <ul className="ypg-meta">
                <li>
                  <span>Name</span>
                  <strong>{customerName}</strong>
                </li>
                <li>
                  <span>Email</span>
                  <strong>{customerEmail}</strong>
                </li>
              </ul>
            </aside>

            <section className="ypg-methods">
              {gateway === 'razorpay' ? (
                <>
                  <p className="form-note">Razorpay test checkout opens in a secure window.</p>
                  <button type="button" className="btn checkout-pay" disabled={busy} onClick={() => confirmPay()}>
                    {busy ? 'Please wait…' : `Pay ${formatPrice(amount)} with Razorpay`}
                  </button>
                </>
              ) : (
                <>
                  <div className="ypg-tabs" role="tablist" aria-label="Payment method">
                    {(
                      [
                        ['upi', 'UPI'],
                        ['card', 'Card'],
                        ['netbanking', 'Net banking'],
                        ['cash', 'Cash on delivery'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={method === id}
                        className={method === id ? 'is-on' : undefined}
                        onClick={() => {
                          setMethod(id)
                          setPayError('')
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {method === 'upi' ? (
                    <div className="ypg-upi">
                      {upiUri ? (
                        <>
                          <img className="ypg-qr" src={qrImageUrl(upiUri)} alt="Scan to pay with UPI" width={200} height={200} />
                          <p className="form-note">
                            Scan the QR or pay <strong>{upiVpa}</strong> · exact amount {formatPrice(amount)}
                          </p>
                          <div className="ypg-app-row">
                            {UPI_APP_LINKS.map((app) => (
                              <a
                                key={app.id}
                                className="ypg-app-btn"
                                href={buildUpiIntentUri({
                                  payeeVpa: upiVpa,
                                  payeeName,
                                  amountInr: amount,
                                  transactionRef: order.number,
                                  packageName: app.packageName,
                                })}
                              >
                                {app.label}
                              </a>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="auth-error">Set COUCHKRAFT_UPI_VPA in .env to enable QR pay.</p>
                      )}
                      <label className="auth-field">
                        Your UPI ID (for confirmation)
                        <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" />
                      </label>
                    </div>
                  ) : null}

                  {method === 'card' ? (
                    <div className="demo-fields">
                      <label className="auth-field">
                        Card number
                        <input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" />
                      </label>
                    </div>
                  ) : null}

                  {method === 'netbanking' ? (
                    <label className="auth-field">
                      Bank
                      <select value={bank} onChange={(e) => setBank(e.target.value)}>
                        <option>HDFC Bank</option>
                        <option>State Bank of India</option>
                        <option>ICICI Bank</option>
                        <option>Axis Bank</option>
                      </select>
                    </label>
                  ) : null}

                  {method === 'cash' ? (
                    <p className="form-note">Pay in cash when your order is delivered. No online charge today.</p>
                  ) : null}

                  {payError ? <p className="auth-error">{payError}</p> : null}
                  {serverMessage ? <p className="form-note ypg-server-msg">{serverMessage}</p> : null}

                  <button type="button" className="btn checkout-pay" disabled={busy} onClick={() => confirmPay('success')}>
                    {busy
                      ? 'Confirming…'
                      : method === 'cash'
                        ? 'Place cash on delivery order'
                        : `Confirm payment · ${formatPrice(amount)}`}
                  </button>
                  <p className="form-note ypg-hint">
                    Demo checkout: confirming marks the order paid (no real UPI/card charge).
                  </p>
                  {method !== 'cash' ? (
                    <details className="ypg-test-only">
                      <summary>Testing only</summary>
                      <button
                        type="button"
                        className="auth-text-link"
                        disabled={busy}
                        onClick={() => confirmPay('fail')}
                      >
                        Record a test payment failure
                      </button>
                    </details>
                  ) : null}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}