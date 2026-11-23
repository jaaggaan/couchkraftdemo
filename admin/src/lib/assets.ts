function storefrontOrigin() {
  const fromEnv = import.meta.env.VITE_STOREFRONT_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'http://localhost:5173'
}

/** Storefront static paths like /hero-living-hd.jpg live on the customer site (port 5173), not the admin app. */
export function resolveStorefrontAsset(path?: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalised = path.startsWith('/') ? path : `/${path}`
  return `${storefrontOrigin()}${normalised}`
}