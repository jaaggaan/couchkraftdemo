import { ScrollToTop } from './components/ScrollToTop'
import { useEffect } from 'react'
import { supabase, supabaseUrl } from './lib/supabase'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { AuthModal } from './components/AuthModal'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductPage } from './pages/ProductPage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { FaqPage } from './pages/FaqPage'
import { ContactPage } from './pages/ContactPage'
import { AccountLayout } from './pages/account/AccountLayout'
import { AccountHome } from './pages/account/AccountHome'
import { OrdersList } from './pages/account/OrdersList'
import { OrderDetail } from './pages/account/OrderDetail'
import { TrackOrder } from './pages/account/TrackOrder'
import { Addresses } from './pages/account/Addresses'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { PrivacyPage, TermsPage } from './pages/LegalPages'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { WishlistPage } from './pages/WishlistPage'
import { PageTitle } from './components/PageTitle'

export default function App() {
  useEffect(() => {
    console.log('[CouchKraft] Live Supabase URL:', supabaseUrl)
    supabase.from('products').select('*').limit(5).then(res => {
      console.log('[CouchKraft Supabase Storefront Request] Status:', res.status, 'Products received:', res.data?.length)
    })
    supabase.from('categories').select('*').limit(5).then(res => {
      console.log('[CouchKraft Supabase Storefront Request] Status:', res.status, 'Categories received:', res.data?.length)
    })
  }, [])

  return (
    <StoreProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <div className="site-shell">
            <PageTitle />
            <SiteHeader />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/confirmation/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountHome />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="orders/:orderId" element={<OrderDetail />} />
                <Route path="track" element={<TrackOrder />} />
                <Route path="addresses" element={<Addresses />} />
              </Route>
              <Route path="/account/verify" element={<VerifyEmailPage />} />
              <Route path="/account/reset" element={<ResetPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <SiteFooter />
          </div>
          <AuthModal />
        </AuthProvider>
      </BrowserRouter>
    </StoreProvider>
  )
}
