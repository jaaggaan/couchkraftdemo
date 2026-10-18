import { useEffect, useState } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'

export function SupabaseConnectionBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const [errorCategory, setErrorCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const check = async () => {
    setStatus('checking')
    setErrorCategory(null)
    const t0 = performance.now()
    try {
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        setStatus('error')
        setErrorCategory('Missing Environment Variables (VITE_SUPABASE_URL)')
        return
      }

      const { error } = await supabase.from('categories').select('id').limit(1)
      const ms = Math.round(performance.now() - t0)
      setLatency(ms)

      if (error) {
        setStatus('error')
        if (error.code === '42501') setErrorCategory('Permission Denied (RLS policy restriction)')
        else if (error.code === 'PGRST205') setErrorCategory('Missing Table in Database')
        else setErrorCategory(`Query Error: ${error.message}`)
      } else {
        setStatus('connected')
      }
    } catch (err: any) {
      setLatency(Math.round(performance.now() - t0))
      setStatus('error')
      setErrorCategory(err?.message?.includes('fetch') ? 'Network Failure / Offline' : 'Connection Error')
    }
  }

  useEffect(() => { void check() }, [])

  const host = (() => {
    try { return new URL(supabaseUrl).host } catch { return 'unknown' }
  })()

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)',
          background: status === 'connected' ? '#0f291e' : status === 'error' ? '#2f1515' : '#1f1f1f',
          color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status === 'connected' ? '#10b981' : status === 'error' ? '#ef4444' : '#f59e0b',
          boxShadow: status === 'connected' ? '0 0 8px #10b981' : undefined,
        }} />
        <span>Supabase: {status === 'connected' ? 'Connected' : status === 'error' ? 'Connection Issue' : 'Checking…'}</span>
        {latency !== null && status === 'connected' && <span style={{ opacity: 0.6, fontSize: 11 }}>{latency}ms</span>}
      </button>

      {expanded && (
        <div style={{
          position: 'absolute', bottom: 40, right: 0, width: 280,
          background: '#ffffff', color: '#111827', borderRadius: 12, padding: 14,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb', fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Supabase Diagnostic</strong>
            <button type="button" onClick={() => setExpanded(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <div><span style={{ color: '#6b7280' }}>Project Host:</span> <code>{host}</code></div>
            <div>
              <span style={{ color: '#6b7280' }}>Status:</span>{' '}
              <strong style={{ color: status === 'connected' ? '#059669' : '#dc2626' }}>
                {status === 'connected' ? 'Connected (200 OK)' : 'Failed'}
              </strong>
            </div>
            {latency !== null && <div><span style={{ color: '#6b7280' }}>Latency:</span> {latency} ms</div>}
            {errorCategory && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '6px 8px', borderRadius: 6, fontSize: 11 }}>
                {errorCategory}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void check()}
            style={{
              width: '100%', padding: '6px 0', borderRadius: 6, border: 'none',
              background: '#374151', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Run Test Query
          </button>
        </div>
      )}
    </div>
  )
}
