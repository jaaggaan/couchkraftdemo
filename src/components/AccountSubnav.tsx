import { NavLink } from 'react-router-dom'

const links = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/custom-requests', label: 'Custom requests' },
  { to: '/account/track', label: 'Track order' },
  { to: '/account/addresses', label: 'Addresses' },
]

export function AccountSubnav() {
  return (
    <nav className="account-subnav" aria-label="Account sections">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `account-subnav-link${isActive ? ' is-active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}