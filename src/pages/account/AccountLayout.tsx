import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AccountSubnav } from '../../components/AccountSubnav'

export function AccountLayout() {
  const { user, loading, openAuth } = useAuth()

  useEffect(() => {
    if (!loading && !user) openAuth('signin')
  }, [loading, user, openAuth])

  if (loading) {
    return (
      <main id="main" className="page-wrap page-hero">
        <h1>Account</h1>
        <p className="form-note">Checking your session…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main id="main" className="page-wrap page-hero">
        <h1>Account</h1>
        <p className="form-note">Sign in to view your profile and orders.</p>
        <button type="button" className="btn" onClick={() => openAuth('signin')}>
          Sign in
        </button>
      </main>
    )
  }

  return (
    <main id="main" className="page-wrap account-page">
      <header className="account-welcome">
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        <AccountSubnav />
      </header>
      <section className="account-panel">
        <Outlet />
      </section>
    </main>
  )
}
