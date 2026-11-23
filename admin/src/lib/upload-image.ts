import { adminApi } from './api'

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected image file.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadAdminImage(
  file: File,
  objectPath: string,
  bucket = 'products',
  upsert = false,
): Promise<string> {
  const dataUri = await readFileAsDataUri(file)
  if (!dataUri.startsWith('data:image/')) {
    throw new Error('Only JPG, PNG, and WebP image formats are supported.')
  }

  const result = await adminApi.uploadImage({
    dataUri,
    fileName: file.name,
    objectPath,
    bucket,
    upsert,
  })

  if (!result.url) {
    throw new Error('Upload succeeded but no image URL was returned.')
  }
  return result.url
}