export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
] as const

export interface UploadedImageFile {
  size: number
  type: string
  arrayBuffer(): Promise<ArrayBuffer>
}

export type ImageValidation =
  | { ok: true; data: ArrayBuffer; contentType: string }
  | { ok: false; error: string }

export function detectImageType(data: ArrayBuffer): string | null {
  const bytes = new Uint8Array(data)

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

export async function validateImageFile(file: UploadedImageFile): Promise<ImageValidation> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'Selecciona un archivo de imagen.' }
  }
  if (file.size <= 0) {
    return { ok: false, error: 'La imagen está vacía.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen no puede superar 5 MB.' }
  }

  const data = await file.arrayBuffer()
  const detected = detectImageType(data)
  if (!detected || !ALLOWED_IMAGE_TYPES.includes(detected as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG, WebP o GIF.' }
  }

  return { ok: true, data, contentType: detected }
}

export function isValidImageKey(key: string | null): key is string {
  return key !== null && /^image:[A-Za-z0-9-]+$/.test(key)
}

export function imageUrl(key: string): string {
  return `/api/blog/images?key=${key}`
}
