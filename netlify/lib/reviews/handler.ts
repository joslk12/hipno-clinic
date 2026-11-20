import { createHash, timingSafeEqual } from 'node:crypto'
import type {
  ApiErrorBody,
  CreateReviewResult,
  PublicReview,
  Review,
  ReviewStatus,
  ReviewsResponse
} from '../../../src/types/reviews'
import { reviewLimits } from '../../../src/content/reviews'
import type { InvitationStore } from '../review-invitations/store'
import { effectiveStatus, hashInvitationToken } from '../review-invitations/token'
import type { ReviewStore } from './store'
import { detectSpam, hashIp, validateReviewInput } from './validation'

export const APPROVED_MESSAGE = 'Gracias por compartir tu experiencia. Tu reseña ya está publicada.'
export const PENDING_MESSAGE =
  'Gracias por compartir tu experiencia. Tu reseña se publicará después de una revisión.'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
}

/** La asociación al cliente se guarda solo en Blobs; nunca sale en la API pública. */
interface StoredReview extends Review {
  invitationId?: string
}

export interface ReviewsHandlerOptions {
  store: ReviewStore
  invitationStore: InvitationStore
  adminToken?: string
  rateSalt?: string
  now?: () => Date
  generateId?: () => string
  maxPerDay?: number
  maxPublic?: number
}

type ReviewsHandler = (
  request: Request,
  context?: { ip?: string }
) => Promise<Response>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function empty(status: number) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })
}

function errorResponse(status: number, error: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = fields ? { error, fields } : { error }
  return json(body, status)
}

function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    message: review.message,
    createdAt: review.createdAt
  }
}

function sortNewestFirst(reviews: Review[]) {
  return [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function summarize(reviews: Review[]) {
  const count = reviews.length
  const average =
    count === 0
      ? 0
      : Math.round((reviews.reduce((total, review) => total + review.rating, 0) / count) * 10) / 10

  return { average, count }
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

function authorize(request: Request, adminToken?: string) {
  if (!adminToken) {
    return errorResponse(503, 'La administración de reseñas no está configurada.')
  }

  const header = request.headers.get('authorization')
  if (!header) return errorResponse(401, 'No autorizado.')

  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return errorResponse(401, 'No autorizado.')
  if (!safeEqual(match[1].trim(), adminToken)) {
    return errorResponse(403, 'Token administrativo inválido.')
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function handleGet(request: Request, options: ReviewsHandlerOptions) {
  const url = new URL(request.url)

  if (url.searchParams.get('status') === 'pending') {
    const unauthorized = authorize(request, options.adminToken)
    if (unauthorized) return unauthorized

    const pending = sortNewestFirst(
      (await options.store.listReviews()).filter((review) => review.status === 'pending')
    )
    return json({ reviews: pending })
  }

  const approved = sortNewestFirst(
    (await options.store.listReviews()).filter((review) => review.status === 'approved')
  )
  const maxPublic = options.maxPublic ?? reviewLimits.maxPublic
  const response: ReviewsResponse = {
    reviews: approved.slice(0, maxPublic).map(toPublicReview),
    summary: summarize(approved)
  }

  return json(response)
}

async function handlePost(
  request: Request,
  options: ReviewsHandlerOptions,
  ip: string
) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'El cuerpo de la solicitud no es JSON válido.')
  }

  const validation = validateReviewInput(body)
  if (!validation.ok) {
    return errorResponse(400, 'Revisa los campos de la reseña.', validation.fields)
  }

  const input = validation.value
  const now = options.now?.() ?? new Date()
  const createdAt = now.toISOString()

  // 1) La invitación se valida antes de cualquier otro procesamiento.
  if (!input.invitationToken) {
    return errorResponse(401, 'Necesitas una invitación válida para publicar una reseña.')
  }

  const tokenHash = hashInvitationToken(input.invitationToken)
  const invitationRecord = await options.invitationStore.getInvitationWithEtag(tokenHash)
  const invitationStatus = invitationRecord
    ? effectiveStatus(invitationRecord.invitation, now)
    : null

  if (
    !invitationRecord ||
    (invitationStatus !== 'pendiente' && invitationStatus !== 'enviada')
  ) {
    return errorResponse(
      invitationStatus === 'canjeada' ? 403 : 401,
      'La invitación no es válida, expiró o ya fue utilizada.'
    )
  }

  const invitation = invitationRecord.invitation

  // 2) Botón trampa: no consumimos la invitación.
  if (input.honeypot) {
    const hiddenReview: PublicReview = {
      id: 'hidden',
      name: input.name,
      rating: input.rating,
      message: input.message,
      createdAt
    }
    const result: CreateReviewResult = {
      review: hiddenReview,
      status: 'pending',
      message: PENDING_MESSAGE
    }
    return json(result, 201)
  }

  // 3) Límite por IP.
  const rateSalt = options.rateSalt ?? 'origen-consciente'
  const ipHash = hashIp(ip, rateSalt)
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000
  const timestamps = (await options.store.getRateTimestamps(ipHash)).filter((timestamp) => {
    const time = Date.parse(timestamp)
    return Number.isFinite(time) && time > cutoff
  })

  if (timestamps.length >= (options.maxPerDay ?? reviewLimits.maxPerDay)) {
    return errorResponse(
      429,
      'Has alcanzado el límite de reseñas por hoy. Inténtalo de nuevo más tarde.'
    )
  }

  // 4) Spam y moderación (sin cambios).
  const spam = detectSpam(input)
  const status: ReviewStatus = spam.suspicious ? 'pending' : 'approved'
  const review: StoredReview = {
    id: options.generateId?.() ?? crypto.randomUUID(),
    name: input.name,
    rating: input.rating,
    message: input.message,
    status,
    createdAt,
    invitationId: invitation.id
  }

  // 5) Canjeo atómico justo antes de guardar.
  const redeemed = await options.invitationStore.saveInvitation(
    {
      ...invitation,
      status: 'canjeada',
      redeemedAt: createdAt,
      reviewId: review.id
    },
    { onlyIfMatch: invitationRecord.etag }
  )

  if (!redeemed) {
    return errorResponse(409, 'La invitación ya fue utilizada. Solicita una nueva liga.')
  }

  // 6) Si falla el guardado, devolvemos la invitación a su estado anterior.
  try {
    await options.store.saveReview(review)
    await options.store.saveRateTimestamps(ipHash, [...timestamps, createdAt])
  } catch (error) {
    await options.invitationStore.saveInvitation(invitation)
    console.error(
      'reviews save error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return errorResponse(500, 'No pudimos guardar tu reseña. Inténtalo de nuevo.')
  }

  const result: CreateReviewResult = {
    review: toPublicReview(review),
    status,
    message: status === 'approved' ? APPROVED_MESSAGE : PENDING_MESSAGE
  }

  return json(result, 201)
}

async function handlePatch(request: Request, options: ReviewsHandlerOptions) {
  const unauthorized = authorize(request, options.adminToken)
  if (unauthorized) return unauthorized

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'El cuerpo de la solicitud no es JSON válido.')
  }

  if (!isRecord(body) || typeof body.id !== 'string' || body.status !== 'approved') {
    return errorResponse(400, 'La solicitud de moderación no es válida.')
  }

  const review = await options.store.getReview(body.id)
  if (!review) return errorResponse(404, 'La reseña no existe.')

  const approved: Review = { ...review, status: 'approved' }
  await options.store.saveReview(approved)

  return json({ review: toPublicReview(approved) })
}

async function handleDelete(request: Request, options: ReviewsHandlerOptions) {
  const unauthorized = authorize(request, options.adminToken)
  if (unauthorized) return unauthorized

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return errorResponse(400, 'Falta el identificador de la reseña.')

  const review = await options.store.getReview(id)
  if (!review) return errorResponse(404, 'La reseña no existe.')

  await options.store.deleteReview(id)
  return empty(204)
}

export function createReviewsHandler(options: ReviewsHandlerOptions): ReviewsHandler {
  return async (request, context) => {
    try {
      switch (request.method) {
        case 'GET':
          return await handleGet(request, options)
        case 'POST':
          return await handlePost(request, options, context?.ip ?? 'unknown')
        case 'PATCH':
          return await handlePatch(request, options)
        case 'DELETE':
          return await handleDelete(request, options)
        default:
          return new Response(null, {
            status: 405,
            headers: {
              Allow: 'GET, POST, PATCH, DELETE',
              'Cache-Control': 'no-store'
            }
          })
      }
    } catch (error) {
      console.error(
        'reviews handler error:',
        error instanceof Error ? error.message : 'unknown error'
      )
      return errorResponse(500, 'No pudimos procesar las reseñas.')
    }
  }
}
