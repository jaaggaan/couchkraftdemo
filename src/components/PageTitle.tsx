import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getProductBySlug } from '../data/products'

const titles: Record<string, string> = {
  '/': 'CouchKraft — Timeless comfort, naturally crafted',
  '/shop': 'The Collection — CouchKraft',
  '/about': 'About Us — CouchKraft',
  '/blog': 'Journal — CouchKraft',
  '/faq': 'FAQ — CouchKraft',
  '/contact': 'Contact — CouchKraft',
  '/checkout': 'Checkout — CouchKraft',
  '/wishlist': 'Saved pieces — CouchKraft',
  '/account': 'Account — CouchKraft',
  '/account/orders': 'My orders — CouchKraft',
  '/account/custom-requests': 'My custom requests — CouchKraft',
  '/account/track': 'Track order — CouchKraft',
  '/account/addresses': 'Addresses — CouchKraft',
  '/privacy': 'Privacy — CouchKraft',
  '/terms': 'Terms — CouchKraft',
}

export function PageTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const productMatch = pathname.match(/^\/product\/([^/]+)/)
    if (productMatch) {
      const product = getProductBySlug(productMatch[1])
      document.title = product ? `${product.name} — CouchKraft` : 'Piece not found — CouchKraft'
      return
    }
    const confirmMatch = pathname.match(/^\/order\/confirmation\//)
    if (confirmMatch) {
      document.title = 'Order confirmation — CouchKraft'
      return
    }
    document.title = titles[pathname] || 'CouchKraft'
  }, [pathname])

  return null
}
