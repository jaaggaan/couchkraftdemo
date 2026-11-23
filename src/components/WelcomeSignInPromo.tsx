import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const PROMO_KEY = 'ck_auth_promo'

export function WelcomeSignInPromo() {
  const { user, loading, openAuth } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    localStorage.removeItem('ck_welcome_promo_dismissed')
  }, [])

  useEffect(() => {
    if (loading || user) return
    const timer = window.setTimeout(() => setVisible(true), 5000)
    return () => window.clearTimeout(timer)
  }, [loading, user])

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  const dismiss = () => {
    setVisible(false)
  }

  if (!visible || user) return null

  return (
    <div
      className="welcome-signin-promo-backdrop"
      role="presentation"
      onClick={dismiss}
    >
      <aside
        className="welcome-signin-promo"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in for a personal coupon"
        onClick={(e) => e.stopPropagation()}
      >
      <button
        type="button"
        className="welcome-signin-promo-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>
      <p className="welcome-signin-promo-kicker">For you</p>
      <h3 className="welcome-signin-promo-title">Sign in &amp; unlock your CouchKraft coupon</h3>
      <p className="welcome-signin-promo-copy">
        Create an account and we&apos;ll issue a <strong>personal coupon ID</strong> just for you — track it as used or unused in your account.
      </p>
      <div className="welcome-signin-promo-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            sessionStorage.setItem(PROMO_KEY, '1')
            openAuth('signup')
            setVisible(false)
          }}
        >
          Sign up for my coupon
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            sessionStorage.setItem(PROMO_KEY, '1')
            openAuth('signin')
            setVisible(false)
          }}
        >
          I already have an account
        </button>
      </div>
      </aside>
    </div>
  )
}

export function readAuthPromoFlag() {
  return sessionStorage.getItem(PROMO_KEY) === '1'
}

export function clearAuthPromoFlag() {
  sessionStorage.removeItem(PROMO_KEY)
}