import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserIcon } from './Icons'

const items = [
  { to: '/account', label: 'Profile' },
  { to: '/account/orders', label: 'My orders' },
  { to: '/account/custom-requests', label: 'Custom requests' },
  { to: '/account/track', label: 'Track order' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/wishlist', label: 'Saved pieces' },
]

export function AccountMenu() {
  const { user, openAuth, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) {
    return (
      <button type="button" className="icon-btn" aria-label="Sign in" onClick={() => openAuth('signin')}>
        <UserIcon />
      </button>
    )
  }

  const first = user.name.split(' ')[0]

  return (
    <div className="account-menu" ref={wrap}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <UserIcon />
      </button>
      {open ? (
        <div className="account-menu-panel" role="menu">
          <div className="account-menu-top">
            <p className="account-menu-hello">Hello, {first}</p>
          </div>
          <p className="account-menu-heading">Your account</p>
          <div className="account-menu-links">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault()
                  setOpen(false)
                  navigate(item.to)
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="account-menu-foot">
            <button
              type="button"
              className="account-menu-signout"
              onClick={() => {
                setOpen(false)
                void signOut().then(() => navigate('/'))
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
