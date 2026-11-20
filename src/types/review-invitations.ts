export type InvitationChannel = 'email' | 'whatsapp'

export type InvitationStatus = 'pendiente' | 'enviada' | 'canjeada' | 'expirada'

export interface ReviewClient {
  id: string
  name: string
  email: string
  whatsapp: string
  createdAt: string
  updatedAt: string
}

export interface ReviewClientInput {
  name: string
  email: string
  whatsapp: string
}

export interface InvitationSendRecord {
  channel: InvitationChannel
  sentAt: string
  ok: boolean
  error?: string
  providerMessageId?: string
}

/** Registro interno. Nunca se envía al frontend: contiene el hash del token. */
export interface ReviewInvitation {
  id: string
  clientId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  status: InvitationStatus
  redeemedAt?: string
  reviewId?: string
  deactivatedAt?: string
  history: InvitationSendRecord[]
}

/** Vista para el panel. Sin hash ni token en claro. */
export interface ReviewInvitationView {
  id: string
  clientId: string
  clientName: string
  createdAt: string
  expiresAt: string
  status: InvitationStatus
  lastSentAt?: string
  lastChannel?: InvitationChannel
  history: InvitationSendRecord[]
}

export interface ClientsResponse {
  clients: ReviewClient[]
}

export interface ClientMutationResult {
  client: ReviewClient
  message: string
}

export interface InvitationsResponse {
  invitations: ReviewInvitationView[]
  channels: {
    email: boolean
    whatsapp: boolean
  }
}

export interface SendInvitationInput {
  clientId: string
  channels: InvitationChannel[]
  invitationId?: string
}

export interface SendInvitationResult {
  invitationId: string
  link: string
  status: InvitationStatus
  results: Array<{
    channel: InvitationChannel
    ok: boolean
    error?: string
    providerMessageId?: string
  }>
  message: string
}

export interface InvitationStatusResponse {
  valid: boolean
}
