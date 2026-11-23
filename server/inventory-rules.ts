/**
 * CouchKraft inventory model: made-to-order (MTO) vs ready-to-ship (RTS).
 * MTO products ignore stock caps and never decrement stock on payment.
 */

export type InventoryPatch = {
  madeToOrder?: boolean
  made_to_order?: boolean
  readyToShipStock?: number
  ready_to_ship_stock?: number
  lowStockThreshold?: number
  low_stock_threshold?: number
  leadTimeWeeks?: number
  lead_time_weeks?: number
}

export const INVENTORY_PLAYBOOK = {
  mtoTitle: 'Made to order (default)',
  mtoBody:
    'Custom sofas, commissions, and catalogue builds. Turn on Made to order and leave stock at 0 — the storefront never caps quantity or decrements stock.',
  rtsTitle: 'Ready to ship',
  rtsBody:
    'Floor samples, clearance, or finished pieces in the workshop. Turn off Made to order and set a real unit count. Low-stock threshold drives “Only X left” on the shop.',
} as const

export function normalizeInventoryFields<T extends InventoryPatch>(input: T): T {
  const madeToOrder = Boolean(input.madeToOrder ?? input.made_to_order ?? true)
  const readyToShipStock = Math.max(0, Number(input.readyToShipStock ?? input.ready_to_ship_stock) || 0)
  const lowStockThreshold = Math.max(0, Number(input.lowStockThreshold ?? input.low_stock_threshold) || 2)
  const leadTimeWeeks = Math.max(0, Number(input.leadTimeWeeks ?? input.lead_time_weeks) || 3)

  return {
    ...input,
    madeToOrder,
    made_to_order: madeToOrder,
    readyToShipStock,
    ready_to_ship_stock: readyToShipStock,
    lowStockThreshold,
    low_stock_threshold: lowStockThreshold,
    leadTimeWeeks,
    lead_time_weeks: leadTimeWeeks,
  }
}

export function validateInventoryPatch(input: InventoryPatch): string | null {
  const normalized = normalizeInventoryFields(input)
  if (normalized.madeToOrder) return null
  const stock = Number(normalized.readyToShipStock ?? normalized.ready_to_ship_stock) || 0
  const threshold = Number(normalized.lowStockThreshold ?? normalized.low_stock_threshold) || 0
  if (stock < 0) return 'Ready-to-ship stock cannot be negative.'
  if (threshold < 0) return 'Low-stock threshold cannot be negative.'
  return null
}