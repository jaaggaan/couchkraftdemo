import { supabase } from './supabase-client.ts'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import { dataDirectory } from './data-path.ts'

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

const dataDir = dataDirectory()
const storePath = resolve(dataDir, 'customers.json')

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(storePath)) writeFileSync(storePath, '[]', 'utf8')
}

function readAll(): Customer[] {
  ensureStore()
  try {
    const rows = JSON.parse(readFileSync(storePath, 'utf8')) as Customer[]
    return rows.map((customer) => ({ ...customer, addresses: customer.addresses ?? [] }))
  } catch {
    return []
  }
}

function writeAll(customers: Customer[]) {
  ensureStore()
  writeFileSync(storePath, JSON.stringify(customers, null, 2), 'utf8')
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

export function findByEmail(email: string) {
  return readAll().find((customer) => customer.email === email.toLowerCase().trim()) ?? null
}

export function findById(id: string) {
  return readAll().find((customer) => customer.id === id) ?? null
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
}) {
  const customers = readAll()
  const email = input.email.toLowerCase().trim()
  if (customers.some((customer) => customer.email === email)) {
    return { error: 'duplicate' as const }
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
  customers.push(customer)
  writeAll(customers)
  void syncCustomerToSupabase(customer)
  return { customer, verifyToken }
}

export async function verifyPassword(customer: Customer, password: string) {
  return bcrypt.compare(password, customer.passwordHash)
}

export function saveCustomer(updated: Customer) {
  const customers = readAll().map((customer) => (customer.id === updated.id ? updated : customer))
  writeAll(customers)
  void syncCustomerToSupabase(updated)
}

export function updateProfile(
  customer: Customer,
  input: { name: string; email: string; phone: string },
) {
  const email = input.email.toLowerCase().trim()
  const taken = findByEmail(email)
  if (taken && taken.id !== customer.id) return { error: 'duplicate' as const }
  const next: Customer = {
    ...customer,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
  }
  saveCustomer(next)
  return { customer: next }
}

export function issueVerifyToken(customer: Customer) {
  const verifyToken = newToken()
  saveCustomer({
    ...customer,
    verifyTokenHash: hashToken(verifyToken),
    verifyExpires: Date.now() + 1000 * 60 * 60 * 24,
  })
  return verifyToken
}

export function issueResetToken(customer: Customer) {
  const resetToken = newToken()
  saveCustomer({
    ...customer,
    resetTokenHash: hashToken(resetToken),
    resetExpires: Date.now() + 1000 * 60 * 30,
  })
  return resetToken
}

export function findByVerifyToken(token: string) {
  return readAll().find((customer) => tokensMatch(token, customer.verifyTokenHash)) ?? null
}

export function findByResetToken(token: string) {
  return readAll().find((customer) => tokensMatch(token, customer.resetTokenHash)) ?? null
}

export async function setPassword(customer: Customer, password: string) {
  saveCustomer({
    ...customer,
    passwordHash: await bcrypt.hash(password, 12),
    resetTokenHash: null,
    resetExpires: null,
  })
}

export function addAddress(customer: Customer, input: Omit<Address, 'id'>) {
  const address: Address = { ...input, id: randomBytes(8).toString('hex') }
  saveCustomer({ ...customer, addresses: [...customer.addresses, address] })
  return address
}

export function updateAddress(customer: Customer, addressId: string, input: Omit<Address, 'id'>) {
  const addresses = customer.addresses.map((address) => (address.id === addressId ? { ...input, id: addressId } : address))
  if (!addresses.some((address) => address.id === addressId)) return null
  saveCustomer({ ...customer, addresses })
  return addresses.find((address) => address.id === addressId) ?? null
}

export function removeAddress(customer: Customer, addressId: string) {
  if (!customer.addresses.some((address) => address.id === addressId)) return false
  saveCustomer({ ...customer, addresses: customer.addresses.filter((address) => address.id !== addressId) })
  return true
}

export async function syncCustomerToSupabase(customer: Customer) {
  try {
    await supabase.from('customers').upsert([{
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      password_hash: customer.passwordHash,
      email_verified: customer.emailVerified,
      verify_token: customer.verifyTokenHash,
      reset_token: customer.resetTokenHash,
      reset_expires: customer.resetExpires,
      addresses: customer.addresses || [],
      created_at: customer.createdAt,
    }], { onConflict: 'id' })
  } catch (err) {
    console.warn('[Supabase Customer Sync Warning]:', err)
  }
}
