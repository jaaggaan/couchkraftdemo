import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'

export function SettingsPage() {
  const [settings, setSettings] = useState({
    whatsapp: {
      businessPhone: '+91 63607 04340',
      businessName: 'CouchKraft Bespoke Concierge',
      enabled: true,
      conciergeEmail: 'concierge@couchkraft.in',
      workingHours: 'Mon - Sat: 10:00 AM - 7:00 PM IST',
      defaultLeadTimeWeeks: 4,
    },
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminApi.getSettings().then((d) => {
      if (d.settings?.whatsapp) {
        setSettings(d.settings)
      }
    }).catch(() => {})
  }, [])

  const setWa = (key: string, val: any) => {
    setSettings((s) => ({
      ...s,
      whatsapp: { ...s.whatsapp, [key]: val },
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      await adminApi.updateSettings(settings)
      setMsg('Settings saved successfully! WhatsApp concierge is now live.')
    } catch (err: any) {
      setMsg(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>Configuration</div>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 8px' }}>Store &amp; Concierge Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Configure CouchKraft’s verified WhatsApp business number and bespoke concierge parameters. These settings govern customer custom-furniture requests.
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: msg.includes('success') ? '#dcfce7' : '#fee2e2',
          color: msg.includes('success') ? '#166534' : '#b91c1c',
        }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* WHATSAPP CONCIERGE CARD */}
        <section style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>chat</span>
            </div>
            <div>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 600, margin: 0 }}>WhatsApp Business Concierge</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Direct customer bespoke commission &amp; customization enquiry routing</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={settings.whatsapp.enabled}
                onChange={(e) => setWa('enabled', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
              Enable WhatsApp Custom-Made Commission Enquiries
            </label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 28, marginTop: 4 }}>
              When enabled, customers can click "Request Custom-Made Furniture" to submit bespoke enquiries and launch WhatsApp.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Business WhatsApp Number *
              </label>
              <input
                type="text"
                value={settings.whatsapp.businessPhone}
                onChange={(e) => setWa('businessPhone', e.target.value)}
                placeholder="+91 63607 04340"
                required
                style={{
                  width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Include country code (e.g. <code>+91 98765 43210</code> or <code>919876543210</code>).
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Concierge Atelier Name
              </label>
              <input
                type="text"
                value={settings.whatsapp.businessName}
                onChange={(e) => setWa('businessName', e.target.value)}
                placeholder="CouchKraft Bespoke Concierge"
                style={{
                  width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Concierge Contact Email
              </label>
              <input
                type="email"
                value={settings.whatsapp.conciergeEmail || ''}
                onChange={(e) => setWa('conciergeEmail', e.target.value)}
                placeholder="concierge@couchkraft.in"
                style={{
                  width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Atelier Working Hours
              </label>
              <input
                type="text"
                value={settings.whatsapp.workingHours || ''}
                onChange={(e) => setWa('workingHours', e.target.value)}
                placeholder="Mon - Sat: 10:00 AM - 7:00 PM IST"
                style={{
                  width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Default Bespoke Production Lead Time (Weeks)
            </label>
            <input
              type="number"
              min="1"
              max="16"
              value={settings.whatsapp.defaultLeadTimeWeeks || 4}
              onChange={(e) => setWa('defaultLeadTimeWeeks', +e.target.value)}
              style={{
                width: 140, height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                background: 'var(--surface-cream)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Displayed to customers on custom enquiry estimates.
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(131,80,34,0.25)', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
          {saving ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
