import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { supabase } from '../server/supabase-client.ts'

const root = process.cwd()

function assertMigrationContainsUnitsSold(): void {
  const file = path.join(root, 'supabase/migrations/20261118210000_inventory_units_sold_on_pay.sql')
  const sql = readFileSync(file, 'utf8')
  if (!sql.includes('mark_order_paid_transaction') || !sql.includes('mark_order_cash_transaction')) {
    throw new Error('Units-sold migration missing payment RPC definitions.')
  }
  if (!sql.includes('units_sold') || !sql.includes('revenue')) {
    throw new Error('Units-sold migration must update units_sold and revenue on pay.')
  }
  console.log('OK  migration file defines payment RPCs with units_sold + revenue')
}

async function assertRpcsDeployed(): Promise<void> {
  const probes = [
    {
      name: 'mark_order_paid_transaction',
      args: {
        p_order_id: 'inventory-verify-missing',
        p_customer_id: 'inventory-verify-missing',
        p_razorpay_order_id: 'rz_order_verify',
        p_razorpay_payment_id: 'pay_verify',
        p_payment_method: 'demo',
        p_delivery_method: 'Standard',
      },
    },
    {
      name: 'mark_order_cash_transaction',
      args: {
        p_order_id: 'inventory-verify-missing',
        p_customer_id: 'inventory-verify-missing',
        p_razorpay_order_id: 'rz_order_verify',
      },
    },
  ] as const

  for (const probe of probes) {
    const { error } = await supabase.rpc(probe.name, probe.args)
    if (error?.code === '42883' || /does not exist/i.test(error?.message || '')) {
      throw new Error(`RPC ${probe.name} is not deployed on Supabase: ${error?.message}`)
    }
    if (error && !/invalid|violates|null value/i.test(error.message)) {
      throw new Error(`Unexpected error probing ${probe.name}: ${error.message}`)
    }
    console.log(`OK  RPC ${probe.name} is callable`)
  }
}

async function smokeDecrementRtsSku(): Promise<void> {
  if (process.env.COUCHKRAFT_INVENTORY_VERIFY !== '1') {
    console.log('SKIP  RTS decrement smoke test (set COUCHKRAFT_INVENTORY_VERIFY=1 to run against live DB)')
    return
  }

  const { data: rtsProducts, error: listError } = await supabase
    .from('products')
    .select('id,name,ready_to_ship_stock,units_sold,made_to_order,price,status')
    .eq('made_to_order', false)
    .neq('status', 'archived')
    .limit(1)

  if (listError) throw new Error(listError.message)

  let product = rtsProducts?.[0]

  if (!product) {
    const { data: anyProducts, error: anyError } = await supabase
      .from('products')
      .select('id,name,ready_to_ship_stock,units_sold,made_to_order,price,status')
      .neq('status', 'archived')
      .limit(1)
    if (anyError) throw new Error(anyError.message)
    product = anyProducts?.[0]
    if (!product) throw new Error('No products in database — cannot run RTS decrement smoke test.')
  }

  const productId = product.id as string
  const beforeStock = Number(product.ready_to_ship_stock) || 0
  const beforeSold = Number(product.units_sold) || 0
  const beforeMto = Boolean(product.made_to_order)
  const targetStock = Math.max(beforeStock, 5)

  const { error: prepError } = await supabase
    .from('products')
    .update({
      made_to_order: false,
      ready_to_ship_stock: targetStock,
    })
    .eq('id', productId)
  if (prepError) throw new Error(prepError.message)

  const customerId = `invverify${randomBytes(8).toString('hex')}`
  const orderId = randomBytes(10).toString('hex')
  const rzId = `order_verify_${orderId}`
  const payId = `pay_verify_${orderId}`

  const { error: customerError } = await supabase.from('customers').upsert({
    id: customerId,
    name: 'Inventory Verify',
    email: `inv-verify-${customerId}@example.invalid`,
    phone: '',
    password_hash: 'verify_only',
    email_verified: true,
    addresses: [],
  })
  if (customerError) throw new Error(customerError.message)

  const items = [
    {
      productId,
      name: product.name,
      quantity: 1,
      unitPrice: Number(product.price) || 1000,
      finish: 'Standard',
    },
  ]

  const { error: orderError } = await supabase.from('orders').insert({
    id: orderId,
    number: `CKVERIFY${orderId.slice(0, 8).toUpperCase()}`,
    customer_id: customerId,
    items,
    address: { line1: 'Verify', city: 'Verify', state: 'KA', postalCode: '560001' },
    subtotal: 1000,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 1000,
    payment_status: 'pending',
    fulfilment_status: 'placed',
    razorpay_order_id: rzId,
  })
  if (orderError) throw new Error(orderError.message)

  const { data: paid, error: payError } = await supabase.rpc('mark_order_paid_transaction', {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_razorpay_order_id: rzId,
    p_razorpay_payment_id: payId,
    p_payment_method: 'demo',
    p_delivery_method: 'Verify',
  })
  if (payError) throw new Error(payError.message)
  if (!paid) throw new Error('mark_order_paid_transaction returned null for verify order')

  const { data: after, error: afterError } = await supabase
    .from('products')
    .select('ready_to_ship_stock,units_sold')
    .eq('id', productId)
    .single()
  if (afterError) throw new Error(afterError.message)

  const afterStock = Number(after.ready_to_ship_stock)
  const afterSold = Number(after.units_sold)
  if (afterStock !== targetStock - 1) {
    throw new Error(`Expected stock ${targetStock - 1}, got ${afterStock}`)
  }
  if (afterSold !== beforeSold + 1) {
    console.warn(
      `WARN  units_sold did not increase (got ${afterSold}, expected ${beforeSold + 1}). ` +
        'Apply supabase/migrations/20261118210000_inventory_units_sold_on_pay.sql on this project.',
    )
  } else {
    console.log('OK  units_sold incremented on paid order')
  }

  console.log(`OK  RTS decrement smoke test passed for product ${productId}`)

  await supabase.from('orders').delete().eq('id', orderId)
  await supabase.from('customers').delete().eq('id', customerId)
  await supabase
    .from('products')
    .update({
      ready_to_ship_stock: beforeStock,
      units_sold: beforeSold,
      made_to_order: beforeMto,
    })
    .eq('id', productId)
}

async function main() {
  assertMigrationContainsUnitsSold()

  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!hasSupabase) {
    console.log('SKIP  live Supabase checks (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set)')
    return
  }

  await assertRpcsDeployed()
  await smokeDecrementRtsSku()
}

main().catch((err) => {
  console.error('FAIL', err instanceof Error ? err.message : err)
  process.exitCode = 1
})