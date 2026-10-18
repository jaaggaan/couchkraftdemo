import { supabase } from './supabase-client.ts'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

export type Address = {
  id: string
  label: string
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  passwordHash: string
  emailVerified: boolean
  verifyTokenHash: string | null
  verifyExpires: number | null
  resetTokenHash: string | null
  resetExpires: number | null
  createdAt: string
  addresses: Address[]
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken() {
  return randomBytes(32).toString('hex')
}

export function tokensMatch(token: string, hash: string | null) {
  if (!hash) return false
  const left = Buffer.from(hashToken(token))
  const right = Buffer.from(hash)
  return left.length === right.length && timingSafeEqual(left, right)
}

function fromCustomerDbRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    email: (row.email || '').toLowerCase().trim(),
    phone: row.phone || '',
    passwordHash: row.password_hash || '',
    emailVerified: Boolean(row.email_verified),
    verifyTokenHash: row.verify_token || null,
    verifyExpires: row.verify_expires ? Number(row.verify_expires) : null,
    resetTokenHash: row.reset_token || null,
    resetExpires: row.reset_expires ? Number(row.reset_expires) : null,
    createdAt: row.created_at || new Date().toISOString(),
    addresses: Array.isArray(row.addresses) ? row.addresses : [],
  }
}

function toCustomerDbRow(c: Customer): Record<string, any> {
  return {
    id: c.id,
    name: c.name,
    email: c.email.toLowerCase().trim(),
    phone: c.phone || '',
    password_hash: c.passwordHash,
    email_verified: c.emailVerified,
    verify_token: c.verifyTokenHash,
    reset_token: c.resetTokenHash,
    reset_expires: c.resetExpires,
    addresses: c.addresses || [],
    updated_at: new Date().toISOString(),
  }
}

export async function findByEmail(email: string): Promise<Customer | null> {
  const cleanEmail = email.toLowerCase().trim()
  if (!cleanEmail) return null
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle()

  if (error) {
    console.error('[AuthStore] Supabase findByEmail error:', error.message)
    return null
  }
  return data ? fromCustomerDbRow(data) : null
}

export async function findById(id: string): Promise<Customer | null> {
  if (!id) return null
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[AuthStore] Supabase findById error:', error.message)
    return null
  }
  return data ? fromCustomerDbRow(data) : null
}

export function publicCustomer(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    emailVerified: customer.emailVerified,
  }
}

export async function createCustomer(input: {
  name: string
  email: string
  phone: string
  password: string
}): Promise<{ customer: Customer; verifyToken: string } | { error: 'duplicate' }> {
  const email = input.email.toLowerCase().trim()
  const existing = await findByEmail(email)
  if (existing) {
    return { error: 'duplicate' }
  }

  const verifyToken = newToken()
  const customer: Customer = {
    id: randomBytes(12).toString('hex'),
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passwordHash: await bcrypt.hash(input.password, 12),
    emailVerified: false,
    verifyTokenHash: hashToken(verifyToken),
    verifyExpires: Date.now() + 1000 * 60 * 60 * 24,
    resetTokenHash: null,
    resetExpires: null,
    createdAt: new Date().toISOString(),
    addresses: [],
  }

  const row = toCustomerDbRow(customer)
  row.created_at = customer.createdAt

  const { data, error } = await supabase.from('customers').insert([row]).select()
  if (error) {
    console.error('[AuthStore] Supabase createCustomer error:', error.message)
    throw new Error(`Failed to create account in database: ${error.message}`)
  }

  return { customer: fromCustomerDbRow(data[0]), verifyToken }
}

export async function verifyPassword(customer: Customer, password: string) {
  return bcrypt.compare(password, customer.passwordHash)
}

export async function saveCustomer(updated: Customer): Promise<void> {
  const row = toCustomerDbRow(updated)
  const { error } = await supabase.from('customers').upsert([row], { onConflict: 'id' })
  if (error) {
    console.error('[AuthStore] Supabase saveCustomer error:', error.message)
    throw new Error(`Failed to save customer in database: ${error.message}`)
  }
}

export async function updateProfile(
  customer: Customer,
  input: { name: string; email: string; phone: string },
): Promise<{ customer: Customer } | { error: 'duplicate' }> {
  const email = input.email.toLowerCase().trim()
  if (email !== customer.email) {
    const taken = await findByEmail(email)
    if (taken && taken.id !== customer.id) return { error: 'duplicate' }
  }
  const next: Customer = {
    ...customer,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
  }
  await saveCustomer(next)
  return { customer: next }
}

export async function issueVerifyToken(customer: Customer): Promise<string> {
  const verifyToken = newToken()
  await saveCustomer({
    ...customer,
    verifyTokenHash: hashToken(verifyToken),
    verifyExpires: Date.now() + 1000 * 60 * 60 * 24,
  })
  return verifyToken
}

export async function issueResetToken(customer: Customer): Promise<string> {
  const resetToken = newToken()
  await saveCustomer({
    ...customer,
    resetTokenHash: hashToken(resetToken),
    resetExpires: Date.now() + 1000 * 60 * 30,
  })
  return resetToken
}

export async function findByVerifyToken(token: string): Promise<Customer | null> {
  const hashed = hashToken(token)
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('verify_token', hashed)
    .maybeSingle()

  if (error || !data) return null
  return fromCustomerDbRow(data)
}

export async function findByResetToken(token: string): Promise<Customer | null> {
  const hashed = hashToken(token)
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('reset_token', hashed)
    .maybeSingle()

  if (error || !data) return null
  return fromCustomerDbRow(data)
}

export async function setPassword(customer: Customer, password: string): Promise<void> {
  await saveCustomer({
    ...customer,
    passwordHash: await bcrypt.hash(password, 12),
    resetTokenHash: null,
    resetExpires: null,
  })
}

export async function addAddress(customer: Customer, input: Omit<Address, 'id'>): Promise<Address> {
  const address: Address = { ...input, id: randomBytes(8).toString('hex') }
  await saveCustomer({ ...customer, addresses: [...customer.addresses, address] })
  return address
}

export async function updateAddress(customer: Customer, addressId: string, input: Omit<Address, 'id'>): Promise<Address | null> {
  const addresses = customer.addresses.map((address) => (address.id === addressId ? { ...input, id: addressId } : address))
  if (!addresses.some((address) => address.id === addressId)) return null
  await saveCustomer({ ...customer, addresses })
  return addresses.find((address) => address.id === addressId) ?? null
}

export async function removeAddress(customer: Customer, addressId: string): Promise<boolean> {
  if (!customer.addresses.some((address) => address.id === addressId)) return false
  await saveCustomer({ ...customer, addresses: customer.addresses.filter((address) => address.id !== addressId) })
  return true
}

export async function sendEmailOtp(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { shouldCreateUser: true },
    })
    if (error) {
      console.warn('[Supabase Auth OTP Send Warning]:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('[Supabase Auth OTP Send Exception]:', err)
    return { ok: false, error: err.message || 'Failed to dispatch email verification.' }
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = email.toLowerCase().trim()
  const cleanToken = token.trim()

  try {
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    })

    if (error || !data?.user) {
      const fallback = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      })
      if (!fallback.error && fallback.data?.user) {
        data = fallback.data
        error = null
      }
    }

    if (error || !data?.user) {
      return { ok: false, error: error?.message || 'Invalid or expired verification code.' }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Verification failed.' }
  }
}

export async function sendPasswordResetEmail(email: string, redirectTo?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo,
    })
    if (error) {
      console.warn('[Supabase Auth Reset Password Warning]:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('[Supabase Auth Reset Password Exception]:', err)
    return { ok: false, error: err.message || 'Failed to dispatch password reset email.' }
  }
}
