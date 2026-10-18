import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  useEffect(() => { adminApi.getCustomers().then(d => setCustomers(d.customers)).catch(() => {}) }, [])

  return (
    <div>
      <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Customers</h1>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
              {['Name', 'Email', 'Phone', 'Verified', 'Orders', 'Total Spent', 'Joined'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{c.email}</td>
                <td style={{ padding: '10px 14px' }}>{c.phone || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: c.emailVerified ? 'var(--secondary)' : 'var(--text-muted)' }}>{c.emailVerified ? 'verified' : 'cancel'}</span>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.ordersCount}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>₹{(c.totalSpent || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No customers yet.</div>}
      </div>
    </div>
  )
}
