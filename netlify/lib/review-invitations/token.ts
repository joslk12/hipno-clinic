import { createHash, randomBytes } from 'node:crypto'
import type { InvitationStatus } from '../../../src/types/review-invitations'

export const INVITATION_TTL_DAYS = 30

/** 32 bytes aleatorios en base64url (43 caracteres). */
export function createInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

/** En el store solo guardamos el hash; el token en claro viaja solo en la liga. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function invitationExpiry(now = new Date()): string {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function isExpired(expiresAt: string, now = new Date()): boolean {
  const time = Date.parse(expiresAt)
  return !Number.isFinite(time) || time <= now.getTime()
}

/**
 * Estado efectivo: una invitación vencida se muestra como expirada aunque en
 * Blobs siga almacenada como 'enviada'.
 */
export function effectiveStatus(
  invitation: { status: InvitationStatus; expiresAt: string },
  now = new Date()
): InvitationStatus {
  if (invitation.status === 'canjeada') return 'canjeada'
  if (isExpired(invitation.expiresAt, now)) return 'expirada'
  return invitation.status
}
