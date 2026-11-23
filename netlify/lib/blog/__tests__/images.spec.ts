import { describe, expect, it } from 'vitest'
import type { BlogPostRecord } from '../../../../src/types/blog'
import { detectImageType, imageKeysFromText, postImageKeys, validateImageFile } from '../images'

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

describe('claves de imagen del blog', () => {
  const post: BlogPostRecord = {
    id: 'uno',
    slug: 'articulo',
    title: 'Artículo',
    excerpt: 'Resumen',
    contentMarkdown:
      '![Portada](/api/blog/images?key=image:uno)\n\n![Otra](https://sitio.test/api/blog/images?key=image:dos)',
    contentHtml: '<img src="/api/blog/images?key=image:uno" />',
    coverImage: '/api/blog/images?key=image:portada',
    status: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z'
  }

  it('extrae claves de texto y las deduplica', () => {
    expect(imageKeysFromText('/api/blog/images?key=image:uno', null, undefined)).toEqual([
      'image:uno'
    ])
    expect(imageKeysFromText(post.contentMarkdown, post.contentHtml)).toEqual([
      'image:uno',
      'image:dos'
    ])
  })

  it('incluye la portada y descarta URLs externas', () => {
    expect(postImageKeys(post)).toEqual(['image:portada', 'image:uno', 'image:dos'])
    expect(imageKeysFromText('https://ejemplo.test/foto.jpg', 'image:no-valida')).toEqual([])
  })
})
