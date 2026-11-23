import { useEffect, useState } from 'react'
import { authApi } from '../lib/auth-api'
import { useAuth } from '../context/AuthContext'

type PersonalCoupon = {
  id: string
  code: string
  description: string
  type: string
  value: number
  minOrderValue: number
  redeemed: boolean
  source?: string
}

export function PersonalCouponsCard() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState<PersonalCoupon[]>([])

  useEffect(() => {
    if (!user) return
    void authApi.personalCoupons().then((res) => {
      if (res.coupons) setCoupons(res.coupons as PersonalCoupon[])
    })
  }, [user])

  if (!coupons.length) return null

  return (
    <section className="personal-coupons-card">
      <h3>Your personal offers</h3>
      <ul>
        {coupons.map((c) => (
          <li key={c.id}>
            <div className="personal-coupons-code">{c.code}</div>
            <p className="form-note">{c.description}</p>
            <p className="form-note">
              {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`} · Min order ₹{c.minOrderValue.toLocaleString('en-IN')}
            </p>
            <span className={`personal-coupons-badge${c.redeemed ? ' is-used' : ''}`}>{c.redeemed ? 'Used' : 'Unused'}</span>
          </li>
        ))}
      </ul>
      <p className="form-note">Apply your coupon code at checkout. Personal coupons are single-use.</p>
    </section>
  )
}