import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { dataDirectory } from './data-path.ts'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'editor'
  avatarUrl?: string
  passwordHash: string
  createdAt: string
  lastLoginAt?: string
}

export type AdminAuditEntry = {
  id: string
  adminId: string
  adminName: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
  createdAt: string
}

const dataDir = dataDirectory()
const adminsPath = resolve(dataDir, 'admins.json')
const auditPath = resolve(dataDir, 'admin-audit.json')

const ADMIN_SECRET = process.env.COUCHKRAFT_ADMIN_SECRET || 'couchkraft-admin-secure-key-2026'

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(adminsPath)) {
    // Default store owner matching Stitch design: Devang V.
    const defaultPasswordHash = bcrypt.hashSync('Admin@CouchKraft2026!', 10)
    const initialAdmins: AdminUser[] = [
      {
        id: 'admin_devang_01',
        name: 'Devang V.',
        email: 'admin@couchkraft.in',
        role: 'owner',
        avatarUrl:
          'https://lh3.googleusercontent.com/aida/AEtjO1U-jXIhz33Xm08EzyafM8zL58IucpUMfP_Uh1YjU7Bi3wHrNQLs_txrVhHARZ6fMZPpH69tTPUfE_mPEjtFOE7OihQThW0QwICxknNz6Q7mmF1Nzx-x0RQwMIINjOpPvR3iUbX_vOzhimZkLpt5w2RoZrjMdNWGZ69QaRY6F0GIdBzDlqMCsc051Q9nBcvuMDDddNABcdnl2rGXeKcvFZg2i7uVDpVufulCakZsWBY5gkfz4L1MU8ClZ38C9fWHlAGysG2z9OHbSmQ',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
      },
    ]
    writeFileSync(adminsPath, JSON.stringify(initialAdmins, null, 2), 'utf8')
  }

  if (!existsSync(auditPath)) {
    writeFileSync(auditPath, '[]', 'utf8')
  }
}

export function readAdmins(): AdminUser[] {
  ensureStore()
  try {
    return JSON.parse(readFileSync(adminsPath, 'utf8')) as AdminUser[]
  } catch {
    return []
  }
}

export function writeAdmins(admins: AdminUser[]) {
  ensureStore()
  writeFileSync(adminsPath, JSON.stringify(admins, null, 2), 'utf8')
}

export function findAdminByEmail(email: string): AdminUser | null {
  const admins = readAdmins()
  return admins.find((a) => a.email.toLowerCase() === email.toLowerCase().trim()) ?? null
}

export function findAdminById(id: string): AdminUser | null {
  const admins = readAdmins()
  return admins.find((a) => a.id === id) ?? null
}

export function publicAdmin(admin: AdminUser) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
    lastLoginAt: admin.lastLoginAt,
  }
}

export function signAdminToken(admin: AdminUser): string {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      iss: 'couchkraft-admin',
    },
    ADMIN_SECRET,
    { expiresIn: '7d' },
  )
}

export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const payload = jwt.verify(token, ADMIN_SECRET) as { sub: string }
    return findAdminById(payload.sub)
  } catch {
    return null
  }
}

export function logAdminAction(entry: Omit<AdminAuditEntry, 'id' | 'createdAt'>) {
  ensureStore()
  try {
    const existing = JSON.parse(readFileSync(auditPath, 'utf8')) as AdminAuditEntry[]
    const newEntry: AdminAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    }
    existing.unshift(newEntry)
    writeFileSync(auditPath, JSON.stringify(existing.slice(0, 500), null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to log admin action:', err)
  }
}

export function getAuditLogs(limit = 50): AdminAuditEntry[] {
  ensureStore()
  try {
    const existing = JSON.parse(readFileSync(auditPath, 'utf8')) as AdminAuditEntry[]
    return existing.slice(0, limit)
  } catch {
    return []
  }
}
