import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { supabase } from '../server/supabase-client.ts'

const DEMO_EMAIL = 'asha.auth@example.com'
const DEMO_NAME = 'Asha Rao'
const DEMO_PASSWORD = process.env.COUCHKRAFT_DEMO_PASSWORD

async function provisionDemoCustomer() {
  if (!DEMO_PASSWORD) {
    throw new Error('COUCHKRAFT_DEMO_PASSWORD is required for this one-time utility.')
  }

  const email = DEMO_EMAIL.toLowerCase().trim()
  const { data: existing, error: lookupError } = await supabase
    .from('customers')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Could not check the demo customer: ${lookupError.message}`)
  }

  if (existing) {
    const valid = await bcrypt.compare(DEMO_PASSWORD, existing.password_hash)
    console.log(valid ? 'ALREADY_EXISTS_AND_VALID' : 'PASSWORD_REQUIRES_APPROVAL')
    if (!valid) process.exitCode = 2
    return
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const id = randomBytes(12).toString('hex')
  const now = new Date().toISOString()
  const { error: insertError } = await supabase.from('customers').insert({
    id,
    name: DEMO_NAME,
    email,
    phone: '',
    password_hash: passwordHash,
    email_verified: true,
    verify_token: null,
    verify_expires: null,
    reset_token: null,
    reset_expires: null,
    addresses: [],
    created_at: now,
    updated_at: now,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('The demo customer appeared during provisioning; no credentials were changed.')
    }
    throw new Error(`Could not create the demo customer: ${insertError.message}`)
  }

  const { data: confirmed, error: confirmationError } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (confirmationError || !confirmed) {
    throw new Error('Demo customer creation could not be confirmed.')
  }

  console.log('CREATED')
}

void provisionDemoCustomer().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Demo provisioning failed.')
  process.exitCode = 1
})
