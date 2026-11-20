// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Review } from '../../../../src/types/reviews'
import { createMemoryReviewStore } from '../store'

const review: Review = {
  id: 'review-1',
  name: 'Ana',
  rating: 5,
  message: 'Una experiencia muy clara y respetuosa.',
  status: 'approved',
  createdAt: '2026-01-01T12:00:00.000Z'
}

describe('createMemoryReviewStore', () => {
  it('guarda, lista, obtiene y elimina reseñas', async () => {
    const store = createMemoryReviewStore()

    await store.saveReview(review)

    expect(await store.listReviews()).toEqual([review])
    expect(await store.getReview(review.id)).toEqual(review)

    await store.deleteReview(review.id)

    expect(await store.listReviews()).toEqual([])
    expect(await store.getReview(review.id)).toBeNull()
  })

  it('parte de reseñas sembradas y actualiza por id', async () => {
    const store = createMemoryReviewStore([review])

    await store.saveReview({ ...review, status: 'pending' })

    expect(await store.listReviews()).toEqual([{ ...review, status: 'pending' }])
  })

  it('guarda y lee los timestamps de límite por IP', async () => {
    const store = createMemoryReviewStore()

    expect(await store.getRateTimestamps('hash')).toEqual([])

    await store.saveRateTimestamps('hash', ['2026-01-01T12:00:00.000Z'])

    expect(await store.getRateTimestamps('hash')).toEqual(['2026-01-01T12:00:00.000Z'])
  })
})
