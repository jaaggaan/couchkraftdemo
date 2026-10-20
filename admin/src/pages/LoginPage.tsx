import { useState } from 'react'
import { adminApi } from '../lib/api'

export function LoginPage({ onLogin }: { onLogin: (admin: any, token: string) => void }) {
  const [email, setEmail] = useState('admin@couchkraft.in')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { admin, token } = await adminApi.login(email, password)
      onLogin(admin, token)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--canvas-ivory), var(--surface-container))' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, margin: 16, background: '#fff', borderRadius: 16, padding: 'clamp(24px, 5vw, 40px)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 700, marginBottom: 16 }}>C</div>
          <h1 style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 24, color: 'var(--primary)', letterSpacing: '-0.01em' }}>COUCHKRAFT</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 4 }}>ADMIN PORTAL</p>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--error-container)', color: '#93000a', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.02em' }}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)', outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.02em' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter admin password"
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)', outline: 'none' }} />
        </div>
        <button type="submit" disabled={loading} style={{
          width: '100%', height: 46, borderRadius: 8, border: 'none',
          background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          boxShadow: '0 4px 14px rgba(131,80,34,0.3)', transition: 'all 0.2s',
        }}>{loading ? 'Signing in...' : 'Sign In to Admin Portal'}</button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>Default: admin@couchkraft.in / Admin@CouchKraft2026!</p>
      </form>
    </div>
  )
}
