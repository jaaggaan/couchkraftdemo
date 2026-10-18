import { CustomRequestsPage } from './pages/CustomRequestsPage'
import { SettingsPage } from './pages/SettingsPage'
import { supabase, supabaseUrl } from './lib/supabase'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { adminApi } from './lib/api'
import { AdminShell } from './components/AdminShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductEditPage } from './pages/ProductEditPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { InventoryPage } from './pages/InventoryPage'
import { CouponsPage } from './pages/CouponsPage'
import { BannersPage } from './pages/BannersPage'
import { OrdersPage } from './pages/OrdersPage'
import { CustomersPage } from './pages/CustomersPage'

type Admin = { id: string; name: string; email: string; role: string; avatarUrl?: string }
type AdminCtx = { admin: Admin | null; loading: boolean; signOut: () => void; refresh: () => Promise<void> }
const AdminContext = createContext<AdminCtx>({ admin: null, loading: true, signOut: () => {}, refresh: async () => {} })
export const useAdmin = () => useContext(AdminContext)

export default function App() {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const { admin: a } = await adminApi.me()
      setAdmin(a)
    } catch {
      setAdmin(null)
      localStorage.removeItem('ck_admin_token')
    }
  }

  useEffect(() => {
    console.log('[CouchKraft Admin] Live Supabase URL:', supabaseUrl)
    supabase.from('categories').select('*').then(res => {
      console.log('[CouchKraft Admin Supabase Request] Status:', res.status, 'Categories received:', res.data?.length)
    })
    supabase.from('products').select('*').limit(5).then(res => {
      console.log('[CouchKraft Admin Supabase Request] Status:', res.status, 'Products received:', res.data?.length)
    })
    refresh().finally(() => setLoading(false))
  }, [])

  const signOut = () => {
    adminApi.logout().catch(() => {})
    setAdmin(null)
    localStorage.removeItem('ck_admin_token')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--canvas-ivory)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700, margin: '0 auto 16px' }}>C</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading admin portal...</p>
      </div>
    </div>
  )

  if (!admin) return <LoginPage onLogin={(a, token) => { setAdmin(a); localStorage.setItem('ck_admin_token', token) }} />

  return (
    <AdminContext.Provider value={{ admin, loading, signOut, refresh }}>
      <AdminShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductEditPage />} />
          <Route path="/products/:id" element={<ProductEditPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/banners" element={<BannersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/custom-requests" element={<CustomRequestsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminShell>
    </AdminContext.Provider>
  )
}
