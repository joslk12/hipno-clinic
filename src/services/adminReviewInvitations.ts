import type {
  ClientMutationResult,
  ClientsResponse,
  InvitationsResponse,
  ReviewClientInput,
  SendInvitationInput,
  SendInvitationResult
} from '../types/review-invitations'

export class AdminReviewApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'AdminReviewApiError'
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin'
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'No pudimos completar la solicitud.'
    throw new AdminReviewApiError(message, response.status, payload?.fields)
  }

  return payload as T
}

export function listClients(): Promise<ClientsResponse> {
  return request('/api/admin/review-clients')
}

export function createClient(input: ReviewClientInput): Promise<ClientMutationResult> {
  return request('/api/admin/review-clients', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export function updateClient(id: string, input: ReviewClientInput): Promise<ClientMutationResult> {
  return request(`/api/admin/review-clients?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
}

export function deleteClient(id: string): Promise<{ ok: true; message: string }> {
  return request(`/api/admin/review-clients?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export function listInvitations(): Promise<InvitationsResponse> {
  return request('/api/admin/review-invitations')
}

export function sendInvitation(input: SendInvitationInput): Promise<SendInvitationResult> {
  return request('/api/admin/review-invitations', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}
