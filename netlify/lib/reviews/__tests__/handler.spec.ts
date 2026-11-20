// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { ReviewInvitation } from '../../../../src/types/review-invitations'
import type { Review } from '../../../../src/types/reviews'
import {
  createMemoryInvitationStore,
  type InvitationStore
} from '../../review-invitations/store'
import { createInvitationToken, hashInvitationToken } from '../../review-invitations/token'
import { APPROVED_MESSAGE, PENDING_MESSAGE, createReviewsHandler } from '../handler'
import { createMemoryReviewStore, type ReviewStore } from '../store'

const validToken = createInvitationToken()

const validPayload = {
  name: 'Ana López',
  rating: 5,
  message: 'La sesión me ayudó a comprender muchas cosas y me sentí muy acompañada.',
  consent: true,
  invitationToken: validToken
}

const fixedNow = () => new Date('2026-01-01T12:00:00.000Z')

interface JsonBody {
  reviews: Array<{
    id: string
    status?: string
    name?: string
    createdAt?: string
    rating?: number
    message?: string
  }>
  summary: { average: number; count: number }
  status?: string
  message?: string
  error?: string
  fields?: Record<string, string>
  review?: { id: string; name: string; createdAt: string }
}

async function readJson(response: Response) {
  return (await response.json()) as JsonBody
}

function createRequest(
  path = 'https://example.com/api/reviews',
  init: RequestInit = {}
) {
  return new Request(path, init)
}

function postRequest(payload: unknown, ip = '1.2.3.4') {
  const request = createRequest('https://example.com/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return { request, context: { ip } }
}

function invitationRecord(token: string): ReviewInvitation {
  return {
    id: 'inv-1',
    clientId: 'client-1',
    tokenHash: hashInvitationToken(token),
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    status: 'enviada',
    history: []
  }
}

function freshInvitationStore(token = validToken): InvitationStore {
  return createMemoryInvitationStore([invitationRecord(token)])
}

function createHandler(
  store = createMemoryReviewStore(),
  invitationStore = freshInvitationStore(),
  overrides = {}
) {
  let counter = 0

  return createReviewsHandler({
    store,
    invitationStore,
    adminToken: 'admin-token',
    rateSalt: 'test-salt',
    now: fixedNow,
    generateId: () => `review-${++counter}`,
    ...overrides
  })
}

function approvedReview(id: string, rating: number, createdAt: string): Review {
  return {
    id,
    name: `Cliente ${id}`,
    rating,
    message: 'Una experiencia muy clara y respetuosa.',
    status: 'approved',
    createdAt
  }
}

describe('reviews handler GET', () => {
  it('devuelve un resumen vacío sin reseñas', async () => {
    const handler = createHandler()
    const response = await handler(createRequest())
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      reviews: [],
      summary: { average: 0, count: 0 }
    })
  })

  it('ordena de la más reciente a la más antigua y calcula el promedio', async () => {
    const store = createMemoryReviewStore([
      approvedReview('1', 5, '2026-01-01T10:00:00.000Z'),
      approvedReview('2', 3, '2026-01-02T10:00:00.000Z'),
      {
        ...approvedReview('3', 1, '2026-01-03T10:00:00.000Z'),
        status: 'pending'
      }
    ])
    const handler = createHandler(store)
    const response = await handler(createRequest())
    const body = await readJson(response)

    expect(body.reviews.map((review: { id: string }) => review.id)).toEqual(['2', '1'])
    expect(body.summary).toEqual({ average: 4, count: 2 })
    expect(body.reviews[0]).not.toHaveProperty('status')
  })

  it('limita a 50 reseñas pero resume todas las aprobadas', async () => {
    const reviews = Array.from({ length: 55 }, (_, index) =>
      approvedReview(
        String(index),
        5,
        `2026-01-01T${String(index % 24).padStart(2, '0')}:00:00.000Z`
      )
    )
    const handler = createHandler(createMemoryReviewStore(reviews))
    const response = await handler(createRequest())
    const body = await readJson(response)

    expect(body.reviews).toHaveLength(50)
    expect(body.summary).toEqual({ average: 5, count: 55 })
  })

  it('devuelve 500 si el almacenamiento falla', async () => {
    const store = createMemoryReviewStore()
    const failingStore: ReviewStore = {
      ...store,
      listReviews: vi.fn().mockRejectedValue(new Error('boom'))
    }
    const handler = createHandler(failingStore)
    const response = await handler(createRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'No pudimos procesar las reseñas.' })
  })
})

describe('reviews handler POST', () => {
  it('publica automáticamente una reseña limpia', async () => {
    const store = createMemoryReviewStore()
    const handler = createHandler(store)
    const { request, context } = postRequest(validPayload)
    const response = await handler(request, context)
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body.status).toBe('approved')
    expect(body.message).toBe(APPROVED_MESSAGE)
    expect(body.review).toMatchObject({
      id: 'review-1',
      name: validPayload.name,
      rating: 5,
      createdAt: fixedNow().toISOString()
    })
    expect(await store.listReviews()).toHaveLength(1)
  })

  it('guarda como pendiente una reseña sospechosa y no la expone en la API pública', async () => {
    const store = createMemoryReviewStore()
    const handler = createHandler(store)
    const { request, context } = postRequest({
      ...validPayload,
      message: 'Visita https://spam.example.com para más información.'
    })
    const response = await handler(request, context)
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body.status).toBe('pending')
    expect(body.message).toBe(PENDING_MESSAGE)

    const publicResponse = await handler(createRequest())
    const publicBody = await readJson(publicResponse)

    expect(publicBody.reviews).toEqual([])
    expect(publicBody.summary).toEqual({ average: 0, count: 0 })
  })

  it('descarta el honeypot sin almacenar y sin revelar el filtro', async () => {
    const store = createMemoryReviewStore()
    const handler = createHandler(store)
    const { request, context } = postRequest({ ...validPayload, honeypot: 'spam' })
    const response = await handler(request, context)
    const body = await readJson(response)

    expect(response.status).toBe(201)
    expect(body.status).toBe('pending')
    expect(body.message).toBe(PENDING_MESSAGE)
    expect(await store.listReviews()).toEqual([])
  })

  it('valida los campos y devuelve errores por campo', async () => {
    const handler = createHandler()
    const { request, context } = postRequest({
      name: 'A',
      rating: 9,
      message: 'Corto',
      consent: false
    })
    const response = await handler(request, context)
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/Revisa los campos/)
    expect(body.fields).toMatchObject({
      name: expect.any(String),
      rating: expect.any(String),
      message: expect.any(String),
      consent: expect.any(String)
    })
  })

  it('rechaza la reseña sin token de invitación', async () => {
    const store = createMemoryReviewStore()
    const handler = createHandler(store)
    const { request, context } = postRequest({ ...validPayload, invitationToken: '' })
    const response = await handler(request, context)

    expect(response.status).toBe(401)
    expect(await store.listReviews()).toEqual([])
  })

  it('rechaza un token desconocido', async () => {
    const handler = createHandler()
    const { request, context } = postRequest({
      ...validPayload,
      invitationToken: 'token-inexistente'
    })
    const response = await handler(request, context)

    expect(response.status).toBe(401)
  })

  it('rechaza un token ya canjeado', async () => {
    const invitationStore = freshInvitationStore()
    const first = createHandler(createMemoryReviewStore(), invitationStore)
    const { request, context } = postRequest(validPayload)
    expect((await first(request, context)).status).toBe(201)

    const second = createHandler(createMemoryReviewStore(), invitationStore)
    const { request: reusedRequest, context: reusedContext } = postRequest(validPayload)
    const response = await second(reusedRequest, reusedContext)

    expect(response.status).toBe(403)
    expect(await readJson(response)).toMatchObject({ error: /invitación no es válida/i })
  })

  it('devuelve 409 si otra petición canjea la invitación primero', async () => {
    const invitationStore = freshInvitationStore()
    const staleStore: InvitationStore = {
      ...invitationStore,
      saveInvitation: vi.fn().mockResolvedValue(false)
    }
    const handler = createHandler(createMemoryReviewStore(), staleStore)
    const { request, context } = postRequest(validPayload)
    const response = await handler(request, context)

    expect(response.status).toBe(409)
  })

  it('rechaza JSON inválido', async () => {
    const handler = createHandler()
    const request = createRequest('https://example.com/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    })
    const response = await handler(request, { ip: '1.2.3.4' })

    expect(response.status).toBe(400)
  })

  it('limita a tres reseñas por IP en 24 horas', async () => {
    const store = createMemoryReviewStore()

    for (let index = 0; index < 3; index += 1) {
      const { request, context } = postRequest(validPayload)
      const response = await createHandler(store, freshInvitationStore())(request, context)
      expect(response.status).toBe(201)
    }

    const { request, context } = postRequest(validPayload)
    const response = await createHandler(store, freshInvitationStore())(request, context)

    expect(response.status).toBe(429)
  })

  it('permite reseñas de otra IP', async () => {
    const store = createMemoryReviewStore()

    for (let index = 0; index < 3; index += 1) {
      const { request, context } = postRequest(validPayload)
      await createHandler(store, freshInvitationStore())(request, context)
    }

    const { request, context } = postRequest(validPayload, '5.6.7.8')
    const response = await createHandler(store, freshInvitationStore())(request, context)

    expect(response.status).toBe(201)
  })

  it('devuelve 500 si falla el almacenamiento al crear', async () => {
    const store = createMemoryReviewStore()
    const failingStore: ReviewStore = {
      ...store,
      saveReview: vi.fn().mockRejectedValue(new Error('boom'))
    }
    const invitationStore = freshInvitationStore()
    const handler = createHandler(failingStore, invitationStore)
    const { request, context } = postRequest(validPayload)
    const response = await handler(request, context)

    expect(response.status).toBe(500)
    await expect(invitationStore.getInvitation(hashInvitationToken(validToken))).resolves.toMatchObject({
      status: 'enviada'
    })
  })
})

describe('reviews handler methods', () => {
  it('responde 405 para métodos no permitidos', async () => {
    const handler = createHandler()
    const response = await handler(
      createRequest('https://example.com/api/reviews', { method: 'PUT' })
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, POST, PATCH, DELETE')
  })
})
