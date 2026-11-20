import { describe, expect, it } from 'vitest'
import { detectImageType, validateImageFile } from '../images'

function file(bytes: number[], size = bytes.length) {
  return {
    size,
    type: 'image/png',
    arrayBuffer: async () => new Uint8Array(bytes).buffer
  }
}

describe('blog image validation', () => {
  it('detecta formatos por firma', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBe('image/jpeg')
    expect(
      detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer)
    ).toBe('image/png')
    expect(detectImageType(new Uint8Array([1, 2, 3]).buffer)).toBeNull()
  })

  it('acepta imágenes válidas y rechaza tamaños o formatos', async () => {
    expect(
      (await validateImageFile(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        .ok
    ).toBe(true)
    expect((await validateImageFile(file([1, 2, 3]))).ok).toBe(false)
    expect((await validateImageFile(file([0xff, 0xd8, 0xff], 6 * 1024 * 1024))).ok).toBe(false)
  })
})
