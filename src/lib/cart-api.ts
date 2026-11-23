export type CartStockIssue = {
  productId: string
  productName: string
  requested: number
  available: number
  madeToOrder: boolean
  reason: 'insufficient_stock' | 'out_of_stock' | 'not_found' | 'unpublished'
}

export async function validateCartStock(
  items: Array<{ productId: string; quantity: number }>,
): Promise<{ ok: boolean; issues: CartStockIssue[]; message: string | null; status: number }> {
  const response = await fetch('/api/cart/validate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  const data = (await response.json()) as {
    ok?: boolean
    issues?: CartStockIssue[]
    message?: string | null
    error?: string
  }
  return {
    ok: Boolean(data.ok),
    issues: data.issues || [],
    message: data.message ?? data.error ?? null,
    status: response.status,
  }
}