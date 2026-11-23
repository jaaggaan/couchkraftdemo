/** Same algorithm as server/order-store — one CKTRK format for every order. */
export function buildTrackingNumber(order: { id: string; number: string; trackingNumber?: string | null }) {
  if (order.trackingNumber?.trim()) return order.trackingNumber.trim()
  const digits = String(order.number || '').replace(/\D/g, '') || '000000'
  return `CKTRK${digits}${String(order.id || '').slice(-4).toUpperCase()}`
}

export function formatOrderPlacedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}