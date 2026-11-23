/** UPI helpers adapted from the YouPI-PG checkout flow (MIT-compatible patterns). */

export type UpiAppLink = {
  id: string
  label: string
  packageName: string
}

export const UPI_APP_LINKS: UpiAppLink[] = [
  { id: 'gpay', label: 'Google Pay', packageName: 'com.google.android.apps.nbu.paisa.user' },
  { id: 'phonepe', label: 'PhonePe', packageName: 'com.phonepe.app' },
  { id: 'paytm', label: 'Paytm', packageName: 'net.one97.paytm' },
  { id: 'cred', label: 'CRED', packageName: 'com.dreamplug.androidapp' },
]

export function isValidVpa(vpa: string) {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test((vpa || '').trim())
}

export function buildUpiUri(options: {
  payeeVpa: string
  payeeName: string
  amountInr: number
  transactionRef: string
}) {
  const params = new URLSearchParams()
  params.set('pa', options.payeeVpa.trim())
  params.set('pn', options.payeeName.trim())
  params.set('am', options.amountInr.toFixed(2))
  params.set('cu', 'INR')
  if (options.transactionRef) params.set('tn', options.transactionRef)
  return `upi://pay?${params.toString()}`
}

export function buildUpiIntentUri(options: Parameters<typeof buildUpiUri>[0] & { packageName: string }) {
  const query = buildUpiUri(options).split('?')[1] || ''
  return `intent://pay?${query}#Intent;scheme=upi;package=${options.packageName};end`
}

export function qrImageUrl(data: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}