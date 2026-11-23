export function normalizeFestivePercent(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(100, Math.max(1, Math.round(n)))
}

export type ExtraDiscountType = 'festive' | 'standard'

export function hasFestiveDiscount(festivePercent: unknown): boolean {
  return normalizeFestivePercent(festivePercent) > 0
}

export function normalizeExtraDiscountType(value: unknown): ExtraDiscountType {
  return value === 'standard' ? 'standard' : 'festive'
}

export function extraDiscountHeadline(type: unknown, percent: unknown): string | null {
  const pct = normalizeFestivePercent(percent)
  if (!pct) return null
  const kind = normalizeExtraDiscountType(type)
  if (kind === 'festive') return `Festive offer · extra ${pct}% off`
  return `Special offer · extra ${pct}% off`
}

export function extraDiscountShortLabel(type: unknown, percent: unknown): string | null {
  const pct = normalizeFestivePercent(percent)
  if (!pct) return null
  const kind = normalizeExtraDiscountType(type)
  if (kind === 'festive') return `Festive −${pct}%`
  return `Extra −${pct}%`
}

/** Applies extra % off the catalog selling price (stacked on top of MRP/compare). */
export function effectiveSellingPrice(basePrice: number, festivePercent?: unknown): number {
  const base = Math.max(0, Math.round(Number(basePrice) || 0))
  const pct = normalizeFestivePercent(festivePercent)
  if (!pct) return base
  return Math.round(base * (1 - pct / 100))
}