import { describe, expect, it } from 'vitest'
import type { BlogPostRecord } from '../../../../src/types/blog'
import { createMemoryBlogStore } from '../store'

const post: BlogPostRecord = {
  id: 'uno',
  slug: 'hola',
  title: 'Hola',
  excerpt: 'Resumen',
  contentMarkdown: 'Contenido',
  contentHtml: '<p>Contenido</p>',
  coverImage: null,
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z'
}

describe('memory blog store', () => {
  it('guarda, lista y elimina artículos', async () => {
    const store = createMemoryBlogStore({ posts: [post] })
    expect(await store.getPost('uno')).toEqual(post)
    expect(await store.listPosts()).toHaveLength(1)

    await store.savePost({ ...post, id: 'dos', slug: 'dos' })
    expect(await store.listPosts()).toHaveLength(2)
    await store.deletePost('uno')
    expect(await store.getPost('uno')).toBeNull()
  })

  it('guarda imágenes y rate limits', async () => {
    const store = createMemoryBlogStore()
    const data = new Uint8Array([1, 2, 3]).buffer
    await store.saveImage('image:uno', {
      data,
      etag: 'abc',
      metadata: { contentType: 'image/png' }
    })
    const image = await store.getImage('image:uno')
    expect(image?.etag).toBe('abc')
    expect(image?.metadata.contentType).toBe('image/png')

    await store.saveRateTimestamps('login:uno', ['2026-01-01T00:00:00.000Z'])
    expect(await store.getRateTimestamps('login:uno')).toEqual(['2026-01-01T00:00:00.000Z'])
  })
})
