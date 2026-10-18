import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { products as initialProducts, type Product } from '../data/products'
import { DEMO_COUPON } from '../data/site'
import { supabase } from '../lib/supabase'

import type { SelectedCustomization } from '../data/products'

export type CartItem = {
  productId: string
  quantity: number
  finish: string
  customization?: SelectedCustomization
  customUnitPrice?: number
}

type StoreContextValue = {
  products: Product[]
  cart: CartItem[]
  wishlist: string[]
  coupon: string | null
  cartCount: number
  cartSubtotal: number
  cartDiscount: number
  cartTotal: number
  addToCart: (productId: string, quantity?: number, finish?: string, customization?: SelectedCustomization) => void
  setQuantity: (productId: string, quantity: number, customization?: SelectedCustomization) => void
  removeFromCart: (productId: string, finish?: string, customization?: SelectedCustomization) => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  applyCoupon: (code: string) => { ok: boolean; message: string }
  clearCoupon: () => void
  getCartProducts: () => Array<{ product: Product; quantity: number; finish: string; customization?: SelectedCustomization; unitPrice: number }>
  clearCart: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const CART_KEY = 'couchkraft.cart.mock'
const WISH_KEY = 'couchkraft.wishlist.mock'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [liveProducts, setLiveProducts] = useState<Product[]>(initialProducts)
  const [coupons, setCoupons] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>(() => readJson(CART_KEY, []))
  const [wishlist, setWishlist] = useState<string[]>(() => readJson(WISH_KEY, []))
  const [coupon, setCoupon] = useState<string | null>(null)
  const [couponData, setCouponData] = useState<any | null>(null)

  // Fetch live products from Supabase
  useEffect(() => {
    const fetchLiveProducts = () => {
      supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .then(({ data, error }) => {
          if (!error && data && data.length) {
            const mapped: Product[] = data.map((row: any) => ({
              id: row.id,
              slug: row.slug,
              name: row.name,
              price: Number(row.price) || 0,
              compareAt: row.compare_at ? Number(row.compare_at) : undefined,
              description: row.description || '',
              category: row.category || 'Standard',
              space: row.space || 'living',
              tabs: Array.isArray(row.tabs) ? row.tabs : ['bestsellers'],
              images: Array.isArray(row.images) && row.images.length ? row.images : initialProducts[0].images,
              finishes: Array.isArray(row.finishes) && row.finishes.length ? row.finishes : ['Standard'],
              care: row.care || '',
              readyToShipStock: Number(row.ready_to_ship_stock ?? row.readyToShipStock) || 0,
              lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold) || 2,
              madeToOrder: Boolean(row.made_to_order ?? row.madeToOrder),
              leadTimeWeeks: Number(row.lead_time_weeks ?? row.leadTimeWeeks) || 3,
              status: row.status || 'published',
              customizationEnabled: row.customization_enabled ?? row.customizationEnabled ?? true,
              customizationOptions: row.customization_options ?? row.customizationOptions,
            }))
            setLiveProducts(mapped)
          }
        })
    }

    fetchLiveProducts()
    window.addEventListener('focus', fetchLiveProducts)

    // Fetch active coupons from Supabase
    supabase
      .from('coupons')
      .select('*')
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length) setCoupons(data)
      })

    return () => {
      window.removeEventListener('focus', fetchLiveProducts)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = liveProducts.find((p) => p.id === item.productId) || initialProducts.find((p) => p.id === item.productId)
        if (!product) return sum
        const delta = item.customization?.totalCustomizationDelta || 0
        const unitPrice = item.customUnitPrice ?? (product.price + delta)
        return sum + unitPrice * item.quantity
      }, 0),
    [cart, liveProducts],
  )

  const cartDiscount = useMemo(() => {
    if (!coupon) return 0
    if (couponData) {
      if (couponData.type === 'percent') {
        const disc = Math.round(cartSubtotal * (Number(couponData.value) / 100))
        return couponData.max_discount ? Math.min(disc, Number(couponData.max_discount)) : disc
      }
      return Math.min(cartSubtotal, Number(couponData.value) || 0)
    }
    if (coupon === DEMO_COUPON.code) {
      return Math.round(cartSubtotal * (DEMO_COUPON.percent / 100))
    }
    return 0
  }, [coupon, couponData, cartSubtotal])

  const value = useMemo<StoreContextValue>(
    () => ({
      products: liveProducts,
      cart,
      wishlist,
      coupon,
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      cartSubtotal,
      cartDiscount,
      cartTotal: Math.max(0, cartSubtotal - cartDiscount),
      addToCart: (productId, quantity = 1, finish, customization) => {
        setCart((current) => {
          const product = liveProducts.find((p) => p.id === productId) || initialProducts.find((p) => p.id === productId)
          const isMadeToOrder = Boolean(product?.madeToOrder ?? true)
          const stock = product?.readyToShipStock ?? 10
          if (!isMadeToOrder && stock <= 0) {
            return current
          }

          const chosenFinish = finish ?? product?.finishes[0] ?? 'Standard'
          const delta = customization?.totalCustomizationDelta || 0
          const unitPrice = (product?.price || 0) + delta

          // Check if an identical custom piece already exists in bag
          const matchIndex = current.findIndex(
            (it) =>
              it.productId === productId &&
              it.finish === chosenFinish &&
              JSON.stringify(it.customization || {}) === JSON.stringify(customization || {})
          )

          if (matchIndex > -1) {
            const existing = current[matchIndex]
            const nextQty = isMadeToOrder ? existing.quantity + quantity : Math.min(stock, existing.quantity + quantity)
            const nextList = [...current]
            nextList[matchIndex] = { ...existing, quantity: nextQty }
            return nextList
          }

          const initialQty = isMadeToOrder ? quantity : Math.min(stock, quantity)
          return [
            ...current,
            {
              productId,
              quantity: initialQty,
              finish: chosenFinish,
              customization: customization || undefined,
              customUnitPrice: unitPrice,
            },
          ]
        })
      },
      setQuantity: (productId, quantity, customization) => {
        setCart((current) =>
          quantity <= 0
            ? current.filter(
                (item) =>
                  !(
                    item.productId === productId &&
                    (!customization || JSON.stringify(item.customization || {}) === JSON.stringify(customization))
                  )
              )
            : current.map((item) => {
                if (
                  item.productId === productId &&
                  (!customization || JSON.stringify(item.customization || {}) === JSON.stringify(customization))
                ) {
                  return { ...item, quantity }
                }
                return item
              }),
        )
      },
      removeFromCart: (productId, finish, customization) =>
        setCart((current) =>
          current.filter((item) => {
            if (item.productId !== productId) return true
            if (finish && item.finish !== finish) return true
            if (customization && JSON.stringify(item.customization || {}) !== JSON.stringify(customization)) return true
            return false
          }),
        ),
      toggleWishlist: (productId) => {
        setWishlist((current) =>
          current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
        )
      },
      isWishlisted: (productId) => wishlist.includes(productId),
      applyCoupon: (code) => {
        const normalised = code.trim().toUpperCase()
        if (!normalised) return { ok: false, message: 'Please enter a coupon code.' }

        // 1. Check live coupons from Supabase
        const found = coupons.find((c) => c.code.toUpperCase() === normalised)
        if (found) {
          const minVal = Number(found.min_order_value) || 0
          if (cartSubtotal < minVal) {
            return {
              ok: false,
              message: `This coupon requires a minimum cart value of ₹${minVal.toLocaleString('en-IN')}.`,
            }
          }
          setCoupon(normalised)
          setCouponData(found)
          const desc = found.type === 'percent' ? `${found.value}% off` : `₹${found.value} off`
          return { ok: true, message: `Coupon ${normalised} applied (${desc}).` }
        }

        // 2. Fallback to demo coupon
        if (normalised === DEMO_COUPON.code) {
          setCoupon(DEMO_COUPON.code)
          setCouponData(null)
          return { ok: true, message: `Demonstration coupon applied (${DEMO_COUPON.percent}% off).` }
        }

        return { ok: false, message: 'Invalid coupon code. Try WARM10 or FESTIVE15.' }
      },
      clearCoupon: () => {
        setCoupon(null)
        setCouponData(null)
      },
      getCartProducts: () =>
        cart.flatMap((item) => {
          const product = liveProducts.find((p) => p.id === item.productId) || initialProducts.find((p) => p.id === item.productId)
          if (!product) return []
          const delta = item.customization?.totalCustomizationDelta || 0
          const unitPrice = item.customUnitPrice ?? (product.price + delta)
          return [
            {
              product,
              quantity: item.quantity,
              finish: item.finish,
              customization: item.customization,
              unitPrice,
            },
          ]
        }),
      clearCart: () => {
        setCart([])
        setCoupon(null)
        setCouponData(null)
      },
    }),
    [liveProducts, coupons, cart, wishlist, coupon, couponData, cartSubtotal, cartDiscount],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
