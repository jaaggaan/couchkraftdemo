export type Address = {
  id: string
  label: string
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type FulfilmentStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'

export type PaymentStatus = 'pending' | 'unpaid' | 'paid' | 'failed' | 'refunded'

export type OrderContact = {
  name: string
  email: string
  phone: string
}

export type OrderItem = {
  productId: string
  name: string
  slug: string
  image: string
  finish: string
  quantity: number
  unitPrice: number
  customization?: any
}

export type Order = {
  id: string
  number: string
  customerId: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  coupon: string | null
  paymentStatus: PaymentStatus
  fulfilmentStatus: FulfilmentStatus
  shippingAddress: Address | null
  deliveryMethod: string | null
  trackingNumber: string | null
  estimatedDelivery: string | null
  contact?: OrderContact | null
  amountPaise?: number
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  paymentError?: string | null
  paymentMethod?: string | null
}

export const FULFILMENT_STEPS: { id: FulfilmentStatus; label: string }[] = [
  { id: 'placed', label: 'Order placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivered' },
]

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T & { status: number; error?: string }> {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await response.json()) as T & { error?: string }
  return { ...data, status: response.status }
}

export const ordersApi = {
  list: () => request<{ orders: Order[] }>('/api/orders'),
  get: (id: string) => request<{ order: Order }>(`/api/orders/${id}`),
  lookup: (number: string) => request<{ order: Order }>(`/api/orders/lookup?number=${encodeURIComponent(number)}`),
  create: (payload: {
    items: Array<{ productId: string; quantity: number; finish: string }>
    addressId?: string
    coupon?: string | null
  }) => request<{ order: Order }>('/api/orders', 'POST', payload),
}

export const addressesApi = {
  list: () => request<{ addresses: Address[] }>('/api/addresses'),
  create: (payload: Omit<Address, 'id'>) => request<{ address: Address }>('/api/addresses', 'POST', payload),
  update: (id: string, payload: Omit<Address, 'id'>) =>
    request<{ address: Address }>(`/api/addresses/${id}`, 'PUT', payload),
  remove: (id: string) => request<{ ok: boolean }>(`/api/addresses/${id}`, 'DELETE'),
}
