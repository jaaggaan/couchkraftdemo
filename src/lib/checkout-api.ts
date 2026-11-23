import type { Order } from './orders-api'

export type CheckoutSession = {
  gateway?: 'demo' | 'razorpay'
  keyId?: string | null
  razorpayOrderId?: string | null
  amount?: number
  currency?: string
  order?: Order
  alreadyPaid?: boolean
  error?: string
  code?: string
  productId?: string
  productName?: string
  availableStock?: number
  requestedQuantity?: number
  status: number
}

async function request<T>(path: string, body?: unknown): Promise<T & { status: number; error?: string }> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await response.json()) as T & { error?: string }
  return { ...data, status: response.status }
}

export const checkoutApi = {
  config: () =>
    request<{
      configured: boolean
      gateway: 'demo' | 'razorpay'
      mode: string
      keyId: string | null
      upiVpa?: string
      payeeName?: string
      error: string | null
    }>('/api/checkout/config'),
  session: (payload: {
    items: Array<{ productId: string; quantity: number; finish: string }>
    coupon?: string | null
    addressId?: string
    name: string
    phone: string
    label: string
    line1: string
    line2: string
    city: string
    region: string
    postalCode: string
    country: string
  }) => request<CheckoutSession>('/api/checkout/session', payload),
  verify: (payload: {
    orderId: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => request<{ order: Order }>('/api/checkout/verify', payload),
  fail: (orderId: string, reason: string) => request<{ order: Order }>('/api/checkout/fail', { orderId, reason }),
  demoPay: (payload: { orderId: string; method: 'card' | 'cash' | 'upi' | 'netbanking'; action: 'success' | 'fail' }) =>
    request<{ order: Order; failed?: boolean }>('/api/checkout/demo', payload),
}
