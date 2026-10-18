import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../lib/auth-api'
import { CloseIcon, EyeIcon, EyeOffIcon } from './Icons'

type FieldErrors = Record<string, string>

const DEMO_ACCOUNT = {
  email: 'asha.auth@example.com',
  password: 'Crafted12',
}

export function AuthModal() {
  const { modalOpen, view, openAuth, closeAuth, refresh } = useAuth()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [devUrl, setDevUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [otp, setOtp] = useState('')

  useEffect(() => {
    if (!modalOpen) return
    setErrors({})
    setFormError('')
    setFormSuccess('')
    setDevUrl('')
    setBusy(false)
    const previous = document.activeElement
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuth()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => dialogRef.current?.querySelector('input')?.focus(), 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [modalOpen, view, closeAuth])

  if (!modalOpen) return null

  const validateSignIn = () => {
    const next: FieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validateSignUp = () => {
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (phone && !/^[0-9+\-\s]{8,16}$/.test(phone)) next.phone = 'Enter a valid phone number.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submitSignIn = async () => {
    if (!validateSignIn()) return
    setBusy(true)
    setFormError('')
    const result = await authApi.login(email, password)
    setBusy(false)
    if (result.user) {
      await refresh()
      closeAuth()
      return
    }
    if (result.needsVerification) {
      setPassword('')
      setFormError('')
      openAuth('verify')
      setFormSuccess('Please enter your verification code to continue.')
      return
    }
    setFormError(result.error || 'Unable to sign in.')
  }

  const submitSignUp = async () => {
    if (!validateSignUp()) return
    setBusy(true)
    setFormError('')
    setFormSuccess('')
    const result = await authApi.register({ name, email, phone, password, confirmPassword })
    setBusy(false)
    if (result.status === 201) {
      setPassword('')
      setConfirmPassword('')
      openAuth('verify')
      setFormSuccess('Account created! Please enter your verification code below.')
      return
    }
    setFormError(result.error || 'Unable to create this account.')
  }

  const submitVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrors({ otp: 'Please enter the 4-digit verification code.' })
      return
    }
    setBusy(true)
    setFormError('')
    setFormSuccess('')
    const result = await authApi.verifyOtp(email, otp.trim())
    setBusy(false)
    if (result.user) {
      setFormSuccess(result.message || 'Verification successful.')
      await refresh()
      window.setTimeout(() => closeAuth(), 600)
      return
    }
    setFormError(result.error || 'Verification failed. In development demo mode, use demo OTP: 1234')
  }

  const submitForgot = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Enter a valid email address.' })
      return
    }
    setBusy(true)
    setFormError('')
    const result = await authApi.forgot(email)
    setBusy(false)
    setFormSuccess(result.message || 'If an account exists, reset instructions have been sent.')
    setDevUrl(result.devActionUrl || '')
  }

  return (
    <div className="auth-backdrop" onClick={closeAuth}>
      <div
        ref={dialogRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-btn auth-close" aria-label="Close" onClick={closeAuth}>
          <CloseIcon />
        </button>

        {view === 'signin' ? (
          <>
            <h2 id={titleId}>Welcome back</h2>
            <p className="auth-lead">Sign in to discover your saved pieces and manage your orders.</p>
            <div className="auth-demo">
              <p className="auth-demo-label">Demo account</p>
              <p>
                Email <code>{DEMO_ACCOUNT.email}</code>
              </p>
              <p>
                Password <code>{DEMO_ACCOUNT.password}</code>
              </p>
              <button
                type="button"
                className="auth-text-link"
                onClick={() => {
                  setEmail(DEMO_ACCOUNT.email)
                  setPassword(DEMO_ACCOUNT.password)
                  setErrors({})
                  setFormError('')
                }}
              >
                Use demo credentials
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitSignIn()
              }}
            >
              <label className="auth-field">
                Email address
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email ? <span className="auth-error">{errors.email}</span> : null}
              </label>
              <label className="auth-field">
                Password
                <span className="auth-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword((open) => !open)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </span>
                {errors.password ? <span className="auth-error">{errors.password}</span> : null}
              </label>
              <button type="button" className="auth-text-link" onClick={() => openAuth('forgot')}>
                Forgot password?
              </button>
              {formError ? <p className="auth-error">{formError}</p> : null}
              {formError.toLowerCase().includes('verify') ? (
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => {
                    void authApi.resend(email).then((result) => {
                      setFormSuccess(result.message || 'Verification sent.')
                      setDevUrl(result.devActionUrl || '')
                    })
                  }}
                >
                  Resend verification email
                </button>
              ) : null}
              {formSuccess ? <p className="auth-success">{formSuccess}</p> : null}
              {devUrl && view === 'signin' ? (
                <p className="auth-dev">
                  Local setup has no email delivery. <a href={devUrl}>Verify your email</a>
                </p>
              ) : null}
              <button className="btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p className="auth-switch">
              New to CouchKraft?{' '}
              <button type="button" className="auth-text-link" onClick={() => openAuth('signup')}>
                Create an account
              </button>
            </p>
          </>
        ) : null}

        {view === 'signup' ? (
          <>
            <h2 id={titleId}>Create an account</h2>
            <p className="auth-lead">Save pieces you love and keep your orders in one place.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitSignUp()
              }}
            >
              <label className="auth-field">
                Full name
                <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                {errors.name ? <span className="auth-error">{errors.name}</span> : null}
              </label>
              <label className="auth-field">
                Email address
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email ? <span className="auth-error">{errors.email}</span> : null}
              </label>
              <label className="auth-field">
                Phone number <em>(optional)</em>
                <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                {errors.phone ? <span className="auth-error">{errors.phone}</span> : null}
              </label>
              <label className="auth-field">
                Password
                <span className="auth-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword((open) => !open)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </span>
                {errors.password ? <span className="auth-error">{errors.password}</span> : null}
              </label>
              <label className="auth-field">
                Confirm password
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {errors.confirmPassword ? <span className="auth-error">{errors.confirmPassword}</span> : null}
              </label>
              <p className="auth-legal">
                By creating an account you agree to our <Link to="/terms" onClick={closeAuth}>Terms of Service</Link> and{' '}
                <Link to="/privacy" onClick={closeAuth}>Privacy Policy</Link>.
              </p>
              {formError ? <p className="auth-error">{formError}</p> : null}
              {formSuccess ? <p className="auth-success">{formSuccess}</p> : null}
              {devUrl ? (
                <p className="auth-dev">
                  Local setup has no email delivery. <a href={devUrl}>Verify your email</a>
                </p>
              ) : null}
              <button className="btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" className="auth-text-link" onClick={() => openAuth('signin')}>
                Sign in
              </button>
            </p>
          </>
        ) : null}

        {view === 'verify' ? (
          <>
            <h2 id={titleId}>Verify your email</h2>
            <p className="auth-lead">
              Enter the verification code sent to <strong>{email}</strong>.
            </p>
            <div className="auth-demo">
              <p className="auth-demo-label">Development / Demo Mode</p>
              <p>
                Demo OTP: <code>1234</code>
              </p>
              <button
                type="button"
                className="auth-text-link"
                onClick={() => {
                  setOtp('1234')
                  setErrors({})
                  setFormError('')
                }}
              >
                Auto-fill demo OTP (1234)
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitVerifyOtp()
              }}
            >
              <label className="auth-field">
                Verification Code (OTP)
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoFocus
                  style={{ letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }}
                />
                {errors.otp ? <span className="auth-error">{errors.otp}</span> : null}
              </label>
              {formError ? <p className="auth-error">{formError}</p> : null}
              {formSuccess ? <p className="auth-success">{formSuccess}</p> : null}
              <button className="btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </form>
            <div className="auth-switch">
              <button
                type="button"
                className="auth-text-link"
                onClick={() => {
                  void authApi.resend(email).then((result) => {
                    setFormSuccess(result.message || 'New verification code requested.')
                  })
                }}
              >
                Resend code
              </button>
              {' · '}
              <button
                type="button"
                className="auth-text-link"
                onClick={() => {
                  setOtp('')
                  setFormError('')
                  setFormSuccess('')
                  openAuth('signin')
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        ) : null}

        {view === 'forgot' ? (
          <>
            <h2 id={titleId}>Reset your password</h2>
            <p className="auth-lead">Enter the email on your account and we will send a reset link if it exists.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitForgot()
              }}
            >
              <label className="auth-field">
                Email address
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email ? <span className="auth-error">{errors.email}</span> : null}
              </label>
              {formError ? <p className="auth-error">{formError}</p> : null}
              {formSuccess ? <p className="auth-success">{formSuccess}</p> : null}
              {devUrl ? (
                <p className="auth-dev">
                  Local setup has no email delivery. <a href={devUrl}>Continue with reset link</a>
                </p>
              ) : null}
              <button className="btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="auth-switch">
              <button type="button" className="auth-text-link" onClick={() => openAuth('signin')}>
                Back to sign in
              </button>
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
