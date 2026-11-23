import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../lib/auth-api'
import { OrderTrackingFeed } from '../../components/OrderTrackingFeed'
import { PersonalCouponsCard } from '../../components/PersonalCouponsCard'

export function AccountHome() {
  const { user, refresh } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const startEdit = () => {
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone)
    setError('')
    setEditing(true)
  }

  return (
    <div>
      <OrderTrackingFeed title="Your tracking feed" />
      <PersonalCouponsCard />
      <h2>Profile</h2>

      {editing ? (
        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            void authApi.updateProfile({ name, email, phone }).then(async (result) => {
              setBusy(false)
              if (result.status >= 400) {
                setError(result.error || 'Unable to update your details.')
                return
              }
              await refresh()
              setEditing(false)
            })
          }}
        >
          <label className="auth-field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </label>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="auth-field">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="account-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save details'}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="account-dl">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{user.phone || 'Not added'}</dd>
            </div>
          </dl>
          <div className="account-actions">
            <Link className="btn" to="/shop">
              Continue shopping
            </Link>
            <button type="button" className="btn btn-ghost" onClick={startEdit}>
              Edit details
            </button>
          </div>
        </>
      )}
    </div>
  )
}
