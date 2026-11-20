import type {
  ApiErrorBody,
  CreateReviewPayload,
  CreateReviewResult,
  ReviewsResponse
} from '../types/reviews'

export interface InvitationCheckResult {
  valid: boolean
}

export class ReviewsApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'ReviewsApiError'
    this.status = status
    this.fields = fields
  }
}

async function parseError(response: Response): Promise<never> {
  let body: ApiErrorBody | undefined

  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = undefined
  }

  throw new ReviewsApiError(
    body?.error ?? 'No pudimos procesar la solicitud de reseñas.',
    response.status,
    body?.fields
  )
}

export async function checkInvitation(token: string): Promise<InvitationCheckResult> {
  let response: Response

  try {
    response = await fetch(`/api/reviews/invitation?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' }
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos validar la invitación. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as InvitationCheckResult
}

export async function listReviews(): Promise<ReviewsResponse> {
  let response: Response

  try {
    response = await fetch('/api/reviews', {
      headers: { Accept: 'application/json' }
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos conectar con el servicio de reseñas. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as ReviewsResponse
}

export async function createReview(payload: CreateReviewPayload): Promise<CreateReviewResult> {
  let response: Response

  try {
    response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos enviar tu reseña. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as CreateReviewResult
}
