export const COUCHKRAFT_WHATSAPP_PHONE = '916360704340'
export const COUCHKRAFT_BRAND_NAME = 'CouchKraft'

export function buildStoreEnquiryWhatsAppMessage(clientName?: string) {
  const who = clientName?.trim() ? `This is ${clientName.trim()}. ` : ''
  return [
    'Hello CouchKraft,',
    '',
    `${who}I would like to enquire about your handcrafted furniture.`,
    '',
    'Please share catalogue options, pricing and delivery timelines.',
    '',
    'Thank you!',
  ].join('\n')
}

export function buildCustomFurnitureWhatsAppMessage(options: {
  productName?: string
  productUrl?: string
  seating?: string
  dimensions?: string
  material?: string
  fabric?: string
  color?: string
  budget?: string
  notes?: string
  clientName?: string
  clientPhone?: string
}) {
  const lines: string[] = ['Hi CouchKraft,', '', 'I need a custom quote.', '']

  const piece = options.productName?.trim()
  if (piece) lines.push(`Item: ${piece}`)

  const link = options.productUrl?.trim()
  if (link) lines.push(`Link: ${link}`)

  const sizeParts = [options.seating?.trim(), options.dimensions?.trim()].filter(Boolean)
  if (sizeParts.length) lines.push(`Size: ${sizeParts.join(' — ')}`)

  const look = [options.material, options.fabric, options.color]
    .map((s) => s?.trim())
    .filter(Boolean)
  if (look.length) lines.push(`Material & colour: ${[...new Set(look)].join(', ')}`)

  if (options.budget?.trim()) lines.push(`Budget: ${options.budget.trim()}`)
  if (options.notes?.trim()) lines.push(`Extra details: ${options.notes.trim()}`)

  const contact = [options.clientName?.trim(), options.clientPhone?.trim()].filter(Boolean)
  if (contact.length) {
    lines.push('')
    lines.push(`Contact: ${contact.join(' · ')}`)
  }

  lines.push('')
  lines.push('Please share price and delivery time. Thank you!')

  return lines.join('\n')
}

export function getWhatsAppUrl(phone = COUCHKRAFT_WHATSAPP_PHONE, message = '') {
  const cleanPhone = phone.replace(/[^0-9]/g, '') || COUCHKRAFT_WHATSAPP_PHONE
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encoded}`
}