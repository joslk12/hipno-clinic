import { getStore } from '@netlify/blobs'
import type { BlogPostRecord } from '../../../src/types/blog'

export interface BlogImageRecord {
  data: ArrayBuffer
  etag?: string
  metadata: {
    contentType: string
    originalName?: string
    size?: number
  }
}

export interface BlogStore {
  listPosts(): Promise<BlogPostRecord[]>
  getPost(id: string): Promise<BlogPostRecord | null>
  savePost(post: BlogPostRecord): Promise<void>
  deletePost(id: string): Promise<void>
  getImage(key: string): Promise<BlogImageRecord | null>
  saveImage(key: string, image: BlogImageRecord): Promise<void>
  deleteImage(key: string): Promise<void>
  getRateTimestamps(key: string): Promise<string[]>
  saveRateTimestamps(key: string, timestamps: string[]): Promise<void>
}

export function createBlobBlogStore(name = 'blog'): BlogStore {
  const store = getStore({ name, consistency: 'strong' })

  return {
    async listPosts() {
      const { blobs } = await store.list({ prefix: 'post:' })
      const posts = await Promise.all(
        blobs.map(({ key }) => store.get(key, { type: 'json' }) as Promise<BlogPostRecord | null>)
      )

      return posts.filter((post): post is BlogPostRecord => post !== null)
    },
    async getPost(id) {
      return (await store.get(`post:${id}`, { type: 'json' })) as BlogPostRecord | null
    },
    async savePost(post) {
      await store.setJSON(`post:${post.id}`, post)
    },
    async deletePost(id) {
      await store.delete(`post:${id}`)
    },
    async getImage(key) {
      const image = await store.getWithMetadata(key, { type: 'arrayBuffer' })
      if (!image) return null

      return {
        data: image.data,
        etag: image.etag,
        metadata: {
          contentType: String(image.metadata.contentType || 'application/octet-stream'),
          originalName:
            typeof image.metadata.originalName === 'string' ? image.metadata.originalName : undefined,
          size: typeof image.metadata.size === 'number' ? image.metadata.size : undefined
        }
      }
    },
    async saveImage(key, image) {
      await store.set(key, image.data, {
        metadata: {
          contentType: image.metadata.contentType,
          originalName: image.metadata.originalName,
          size: image.metadata.size
        }
      })
    },
    async deleteImage(key) {
      await store.delete(key)
    },
    async getRateTimestamps(key) {
      const timestamps = await store.get(`rate:${key}`, { type: 'json' })
      return Array.isArray(timestamps) ? (timestamps as string[]) : []
    },
    async saveRateTimestamps(key, timestamps) {
      await store.setJSON(`rate:${key}`, timestamps)
    }
  }
}

export interface MemoryBlogStore extends BlogStore {
  posts: Map<string, BlogPostRecord>
  images: Map<string, BlogImageRecord>
  rates: Map<string, string[]>
}

export function createMemoryBlogStore(seed?: {
  posts?: BlogPostRecord[]
  images?: Array<[string, BlogImageRecord]>
  rates?: Array<[string, string[]]>
}): MemoryBlogStore {
  const posts = new Map((seed?.posts ?? []).map((post) => [post.id, structuredClone(post)]))
  const images = new Map(
    (seed?.images ?? []).map(([key, image]) => [
      key,
      { ...image, data: image.data.slice(0), metadata: { ...image.metadata } }
    ])
  )
  const rates = new Map((seed?.rates ?? []).map(([key, value]) => [key, [...value]]))

  return {
    posts,
    images,
    rates,
    async listPosts() {
      return [...posts.values()].map((post) => structuredClone(post))
    },
    async getPost(id) {
      const post = posts.get(id)
      return post ? structuredClone(post) : null
    },
    async savePost(post) {
      posts.set(post.id, structuredClone(post))
    },
    async deletePost(id) {
      posts.delete(id)
    },
    async getImage(key) {
      const image = images.get(key)
      return image
        ? { ...image, data: image.data.slice(0), metadata: { ...image.metadata } }
        : null
    },
    async saveImage(key, image) {
      images.set(key, { ...image, data: image.data.slice(0), metadata: { ...image.metadata } })
    },
    async deleteImage(key) {
      images.delete(key)
    },
    async getRateTimestamps(key) {
      return [...(rates.get(key) ?? [])]
    },
    async saveRateTimestamps(key, timestamps) {
      rates.set(key, [...timestamps])
    }
  }
}
