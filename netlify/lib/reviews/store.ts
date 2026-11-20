import { getStore } from '@netlify/blobs'
import type { Review } from '../../../src/types/reviews'

export interface ReviewStore {
  listReviews(): Promise<Review[]>
  getReview(id: string): Promise<Review | null>
  saveReview(review: Review): Promise<void>
  deleteReview(id: string): Promise<void>
  getRateTimestamps(key: string): Promise<string[]>
  saveRateTimestamps(key: string, timestamps: string[]): Promise<void>
}

export function createBlobReviewStore(name = 'reviews'): ReviewStore {
  const store = getStore({ name, consistency: 'strong' })

  return {
    async listReviews() {
      const { blobs } = await store.list({ prefix: 'review:' })
      const reviews = await Promise.all(
        blobs.map(({ key }) => store.get(key, { type: 'json' }) as Promise<Review | null>)
      )

      return reviews.filter((review): review is Review => review !== null)
    },
    async getReview(id) {
      return (await store.get(`review:${id}`, { type: 'json' })) as Review | null
    },
    async saveReview(review) {
      await store.setJSON(`review:${review.id}`, review)
    },
    async deleteReview(id) {
      await store.delete(`review:${id}`)
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

export function createMemoryReviewStore(seed: Review[] = []): ReviewStore {
  const reviews = new Map(seed.map((review) => [review.id, review]))
  const rateTimestamps = new Map<string, string[]>()

  return {
    async listReviews() {
      return [...reviews.values()]
    },
    async getReview(id) {
      return reviews.get(id) ?? null
    },
    async saveReview(review) {
      reviews.set(review.id, review)
    },
    async deleteReview(id) {
      reviews.delete(id)
    },
    async getRateTimestamps(key) {
      return rateTimestamps.get(key) ?? []
    },
    async saveRateTimestamps(key, timestamps) {
      rateTimestamps.set(key, timestamps)
    }
  }
}
