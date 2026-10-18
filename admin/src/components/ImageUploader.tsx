import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { supabase } from '../lib/supabase'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  productSlug?: string
  bucketName?: string
}

export function ImageUploader({
  images = [],
  onChange,
  productSlug = 'product',
  bucketName = 'products',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMsg('')
    setSuccessMsg('')
    const fileList = Array.from(files)
    if (!fileList.length) return

    // Validation
    const validFiles: File[] = []
    for (const f of fileList) {
      const isImg = f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp'
      if (!isImg) {
        setErrorMsg('Only JPG, PNG, and WebP image formats are supported.')
        return
      }
      if (f.size > 10 * 1024 * 1024) {
        setErrorMsg(`File "${f.name}" exceeds 10MB limit.`)
        return
      }
      validFiles.push(f)
    }

    setUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        setUploadProgress(`Uploading ${i + 1} of ${validFiles.length}: ${file.name}...`)

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const cleanSlug = (productSlug || 'product')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const filePath = `${cleanSlug}-${uniqueId}.${ext}`

        const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

        if (error) {
          if (
            error.message?.includes('Bucket not found') ||
            (error as any).statusCode === '404' ||
            (error as any).code === 'NoSuchBucket'
          ) {
            throw new Error(
              `Supabase Storage bucket "${bucketName}" not found. Please create the public bucket in your Supabase dashboard or SQL editor.`
            )
          } else if (
            error.message?.includes('row-level security') ||
            (error as any).statusCode === '403' ||
            (error as any).code === 'AccessDenied'
          ) {
            throw new Error(
              `Storage RLS permission error. Please enable public INSERT/SELECT policies on the "${bucketName}" bucket.`
            )
          } else {
            throw new Error(error.message || 'Image upload failed.')
          }
        }

        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        if (publicData?.publicUrl) {
          uploadedUrls.push(publicData.publicUrl)
        }
      }

      if (replacingIndex !== null && uploadedUrls.length > 0) {
        const next = [...images]
        next[replacingIndex] = uploadedUrls[0]
        onChange(next)
        setSuccessMsg('Image replaced successfully!')
        setReplacingIndex(null)
      } else {
        onChange([...images, ...uploadedUrls])
        setSuccessMsg(`Uploaded ${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} successfully!`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      setUploadProgress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeImage = (indexToRemove: number) => {
    const next = images.filter((_, idx) => idx !== indexToRemove)
    onChange(next)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return
    const next = [...images]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onChange(next)
  }

  const triggerReplace = (index: number) => {
    setReplacingIndex(index)
    replaceInputRef.current?.click()
  }

  const addUrlImage = () => {
    if (!urlInputValue.trim()) return
    onChange([...images, urlInputValue.trim()])
    setUrlInputValue('')
    setShowUrlInput(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) handleFiles(e.target.files)
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) handleFiles(e.target.files)
        }}
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-subtle, #d8d0c5)',
          background: isDragging ? 'rgba(131,80,34,0.06)' : 'var(--surface-cream, #fbf8f3)',
          borderRadius: 12,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            color: 'var(--primary, #835022)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            {uploading ? 'sync' : 'cloud_upload'}
          </span>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {uploading ? uploadProgress : 'Drag & drop images here, or browse'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Supports JPG, PNG, and WebP (Up to 10MB each)
          </div>
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle, #d8d0c5)',
            background: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            marginTop: 4,
          }}
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fee2e2',
            color: '#b91c1c',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <strong>Notice:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#dcfce7',
            color: '#15803d',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Previews Grid & Image Management */}
      {images.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Product Gallery ({images.length})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>First photo is Cover / Hero</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {images.map((img, i) => (
              <div
                key={`${img}-${i}`}
                style={{
                  position: 'relative',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'var(--surface-container, #f3ede2)',
                  border: i === 0 ? '2px solid var(--primary, #835022)' : '1px solid var(--border-subtle, #e5e0d8)',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Image */}
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={img}
                    alt={`Product ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {i === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'var(--primary, #835022)',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Cover
                    </span>
                  )}
                </div>

                {/* Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '6px 4px',
                    background: '#fff',
                    borderTop: '1px solid var(--border-subtle, #f0eae1)',
                  }}
                >
                  <button
                    type="button"
                    title="Move earlier"
                    disabled={i === 0}
                    onClick={() => moveImage(i, i - 1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: i === 0 ? 'default' : 'pointer',
                      opacity: i === 0 ? 0.3 : 1,
                      padding: 2,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      arrow_back
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Replace with new upload"
                    onClick={() => triggerReplace(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--primary, #835022)',
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      sync
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Move later"
                    disabled={i === images.length - 1}
                    onClick={() => moveImage(i, i + 1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: i === images.length - 1 ? 'default' : 'pointer',
                      opacity: i === images.length - 1 ? 0.3 : 1,
                      padding: 2,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      arrow_forward
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Delete image"
                    onClick={() => removeImage(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: '#dc2626',
                      display: 'flex',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative URL input */}
      <div style={{ marginTop: 2 }}>
        {!showUrlInput ? (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary, #835022)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              link
            </span>
            Add image by web URL instead
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Paste image URL (https://...)"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addUrlImage()
                }
              }}
              style={{
                flex: 1,
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle, #d8d0c5)',
                background: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={addUrlImage}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--primary, #835022)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInputValue('')
              }}
              style={{
                height: 34,
                padding: '0 8px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
