export type CustomRequestStatus = 'new' | 'under_review' | 'quoted' | 'approved' | 'archived'

export type CustomRequest = {
  id: string
  customerName: string
  customerPhone: string
  productName?: string
  productUrl?: string
  seatingCapacity?: string
  dimensions?: { raw?: string; referenceImages?: string[] }
  material?: string
  fabric?: string
  color?: string
  budget?: string
  notes?: string
  referenceImages?: string[]
  status: CustomRequestStatus
  adminNotes?: string
  quoteAmount?: number | null
  paymentStatus?: 'none' | 'awaiting' | 'paid'
  linkedOrderId?: string | null
  createdAt: string
  updatedAt: string
}

export const CUSTOM_REQUEST_STATUS_LABEL: Record<CustomRequestStatus, string> = {
  new: 'Submitted',
  under_review: 'Under atelier review',
  quoted: 'Quote prepared',
  approved: 'Approved',
  archived: 'Closed',
}

async function request<T>(path: string): Promise<T & { status: number; error?: string }> {
  const response = await fetch(path, { credentials: 'include' })
  const data = (await response.json()) as T & { error?: string }
  return { ...data, status: response.status }
}

export function referenceImagesFor(req: CustomRequest): string[] {
  if (Array.isArray(req.referenceImages) && req.referenceImages.length) return req.referenceImages
  const dims = req.dimensions
  if (Array.isArray(dims?.referenceImages)) return dims.referenceImages
  return []
}

export const PAYMENT_STATUS_LABEL: Record<NonNullable<CustomRequest['paymentStatus']>, string> = {
  none: 'Not invoiced',
  awaiting: 'Payment due',
  paid: 'Paid',
}

export type BespokePaymentSession = {
  gateway?: 'demo' | 'razorpay'
  keyId?: string | null
  razorpayOrderId?: string | null
  amount?: number
  currency?: string
  order?: import('./orders-api').Order
  alreadyPaid?: boolean
  request?: CustomRequest
  error?: string
  status: number
}

export const customRequestsApi = {
  list: () => request<{ requests: CustomRequest[] }>('/api/account/custom-requests'),
  get: (id: string) => request<{ request: CustomRequest }>(`/api/account/custom-requests/${encodeURIComponent(id)}`),
  paymentSession: (id: string) =>
    fetch(`/api/account/custom-requests/${encodeURIComponent(id)}/payment-session`, {
      method: 'POST',
      credentials: 'include',
    }).then(async (response) => {
      const data = (await response.json()) as Omit<BespokePaymentSession, 'status'> & { error?: string }
      return { ...data, status: response.status } as BespokePaymentSession
    }),
}