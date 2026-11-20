// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Review } from '../../../../src/types/reviews'
import { createMemoryInvitationStore } from '../../review-invitations/store'
import { createReviewsHandler } from '../handler'
import { createMemoryReviewStore } from '../store'

const pendingReview: Review = {
  id: 'pending-1',
  name: 'Ana',
  rating: 4,
  message: 'Una experiencia para revisar con calma.',
  status: 'pending',
  createdAt: '2026-01-01T12:00:00.000Z'
}

interface JsonBody {
  reviews: Array<{ id: string; status?: string; name?: string }>
  status?: string
  review?: { id: string; name: string }
}

async function readJson(response: Response) {
  return (await response.json()) as JsonBody
}

function createHandler(overrides = {}) {
  return createReviewsHandler({
    store: createMemoryReviewStore([pendingReview]),
    invitationStore: createMemoryInvitationStore(),
    adminToken: 'admin-token',
    rateSalt: 'test-salt',
    now: () => new Date('2026-01-02T12:00:00.000Z'),
    ...overrides
  })
}

function adminRequest(path = 'https://example.com/api/reviews', init: RequestInit = {}) {
  return new Request(path, {
    ...init,
    headers: {
      Authorization: 'Bearer admin-token',
      'Content-Type': 'application/json',
      ...init.headers
    }
  })
}

describe('moderación administrativa', () => {
  it('lista reseñas pendientes con token válido', async () => {
    const handler = createHandler()
    const response = await handler(adminRequest('https://example.com/api/reviews?status=pending'))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.reviews).toEqual([pendingReview])
  })

  it('no expone pendientes en la API pública', async () => {
    const handler = createHandler()
    const response = await handler(new Request('https://example.com/api/reviews'))
    const body = await readJson(response)

    expect(body.reviews).toEqual([])
  })

  it('aprueba una reseña pendiente y la publica', async () => {
    const handler = createHandler()
    const response = await handler(
      adminRequest('https://example.com/api/reviews', {
        method: 'PATCH',
        body: JSON.stringify({ id: pendingReview.id, status: 'approved' })
      })
    )
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.review).toMatchObject({ id: pendingReview.id, name: pendingReview.name })

    const publicResponse = await handler(new Request('https://example.com/api/reviews'))
    const publicBody = await readJson(publicResponse)

    expect(publicBody.reviews).toHaveLength(1)
    expect(publicBody.reviews[0].id).toBe(pendingReview.id)
  })

  it('elimina una reseña y la quita de la API pública', async () => {
    const store = createMemoryReviewStore([{ ...pendingReview, status: 'approved' }])
    const handler = createHandler({ store })
    const response = await handler(
      adminRequest(`https://example.com/api/reviews?id=${pendingReview.id}`, {
        method: 'DELETE'
      })
    )

    expect(response.status).toBe(204)

    const publicResponse = await handler(new Request('https://example.com/api/reviews'))
    const publicBody = await readJson(publicResponse)

    expect(publicBody.reviews).toEqual([])
  })

  it('responde 401 sin token', async () => {
    const handler = createHandler()
    const response = await handler(
      new Request('https://example.com/api/reviews?status=pending')
    )

    expect(response.status).toBe(401)
  })

  it('responde 401 con un esquema de autorización inválido', async () => {
    const handler = createHandler()
    const response = await handler(
      new Request('https://example.com/api/reviews?status=pending', {
        headers: { Authorization: 'Basic admin-token' }
      })
    )

    expect(response.status).toBe(401)
  })

  it('responde 403 con token inválido', async () => {
    const handler = createHandler()
    const response = await handler(
      new Request('https://example.com/api/reviews?status=pending', {
        headers: { Authorization: 'Bearer otro-token' }
      })
    )

    expect(response.status).toBe(403)
  })

  it('responde 503 si el token administrativo no está configurado', async () => {
    const handler = createHandler({ adminToken: undefined })
    const response = await handler(adminRequest('https://example.com/api/reviews?status=pending'))

    expect(response.status).toBe(503)
  })

  it('valida la solicitud de aprobación y la existencia de la reseña', async () => {
    const handler = createHandler()

    const invalid = await handler(
      adminRequest('https://example.com/api/reviews', {
        method: 'PATCH',
        body: JSON.stringify({ id: pendingReview.id, status: 'otro' })
      })
    )
    expect(invalid.status).toBe(400)

    const missing = await handler(
      adminRequest('https://example.com/api/reviews', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'no-existe', status: 'approved' })
      })
    )
    expect(missing.status).toBe(404)
  })

  it('responde 400 al eliminar sin id y 404 si no existe', async () => {
    const handler = createHandler()

    const noId = await handler(
      adminRequest('https://example.com/api/reviews', { method: 'DELETE' })
    )
    expect(noId.status).toBe(400)

    const missing = await handler(
      adminRequest('https://example.com/api/reviews?id=no-existe', { method: 'DELETE' })
    )
    expect(missing.status).toBe(404)
  })
})
