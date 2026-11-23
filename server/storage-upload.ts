import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { supabase } from './supabase-client.ts'

export type ParsedImageDataUri = {
  buffer: Buffer
  contentType: string
  ext: string
}

export function parseImageDataUri(dataUri: string): ParsedImageDataUri | null {
  if (!dataUri.startsWith('data:image/')) return null
  const matches = dataUri.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
  if (!matches) return null
  const rawType = matches[1].toLowerCase()
  const ext = rawType === 'jpeg' ? 'jpg' : rawType.replace('+xml', '')
  const contentType = rawType === 'jpeg' ? 'image/jpeg' : `image/${rawType}`
  const buffer = Buffer.from(matches[2], 'base64')
  return { buffer, contentType, ext }
}

export function isAllowedReferenceImageUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  if (t.startsWith('/uploads/')) return true
  return /^https?:\/\//i.test(t)
}

export async function uploadPublicImage(
  bucket: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string,
  upsert = false,
): Promise<{ url: string; source: 'supabase' | 'local'; warning?: string }> {
  const safePath = objectPath.replace(/^\/+/, '')

  const { error: storageError } = await supabase.storage.from(bucket).upload(safePath, buffer, {
    contentType,
    upsert,
    cacheControl: '3600',
  })

  if (!storageError) {
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(safePath)
    const supabaseUrl =
      publicData.publicUrl ||
      `${String(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${safePath}`
    return { url: supabaseUrl, source: 'supabase' }
  }

  console.warn(`[StorageUpload] ${bucket}/${safePath}:`, storageError.message)

  const publicUploads = resolve(process.cwd(), 'public', 'uploads')
  if (!existsSync(publicUploads)) mkdirSync(publicUploads, { recursive: true })

  const baseName = safePath.split('/').pop() || `upload_${Date.now()}.bin`
  const finalName = `upload_${Date.now()}_${baseName}`
  writeFileSync(resolve(publicUploads, finalName), buffer)

  return {
    url: `/uploads/${finalName}`,
    source: 'local',
    warning: storageError.message,
  }
}

export function customRequestObjectPath(userId: string, fileName: string, ext: string) {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'guest'
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80) || 'reference'
  const stamp = `${Date.now()}_${randomBytes(3).toString('hex')}`
  return `custom-requests/${safeUser}/${stamp}_${safeName}.${ext}`
}