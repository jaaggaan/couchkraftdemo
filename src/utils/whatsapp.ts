export const COUCHKRAFT_WHATSAPP_PHONE = '916360704340'

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
  const lines = [
    'Hello CouchKraft Atelier Concierge,',
    '',
    options.productName
      ? `I would like to enquire about a bespoke custom-made furniture piece based on: *${options.productName}*`
      : 'I would like to enquire about commissioning a bespoke custom-made furniture piece.',
    options.productUrl ? `*Piece Link:* ${options.productUrl}` : '',
    '',
    'Here are my requested specifications:',
    `- Seating Capacity: ${options.seating || '[e.g. 2-Seater / 3-Seater / 4-Seater / L-Shaped]' }`,
    `- Desired Dimensions: ${options.dimensions || '[e.g. Width: ___cm × Depth: ___cm × Height: ___cm]' }`,
    `- Preferred Fabric / Upholstery: ${options.fabric || options.material || '[e.g. Belgian Linen / Velvet / Bouclé / Leather]' }`,
    `- Preferred Color / Tone: ${options.color || '[e.g. Warm Ivory / Terracotta / Dark Walnut]' }`,
    `- Structural Material: ${options.material ? options.material : '[e.g. Teak Hardwood / Sheesham / Oak]' }`,
    `- Target Budget Range: ${options.budget || '[e.g. ₹50,000 – ₹1,50,000]' }`,
    options.notes ? `- Specific Requirements: ${options.notes}` : '- Specific Requirements: [e.g. Left chaise orientation, firm cushion, brass legs]',
    '',
    options.clientName ? `*Client Name:* ${options.clientName} ${options.clientPhone ? `(${options.clientPhone})` : ''}` : '',
    '',
    'Could you please advise on bespoke estimate, fabric swatches, and crafting lead time?',
  ].filter(Boolean)

  return lines.join('\n')
}

export function getWhatsAppUrl(phone = COUCHKRAFT_WHATSAPP_PHONE, message = '') {
  const cleanPhone = phone.replace(/[^0-9]/g, '') || COUCHKRAFT_WHATSAPP_PHONE
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encoded}`
}
