import { describe, expect, it } from 'vitest'
import {
  createInvitationToken,
  effectiveStatus,
  hashInvitationToken,
  INVITATION_TTL_DAYS,
  invitationExpiry,
  isExpired
} from '../token'

describe('review invitation token', () => {
  it('genera tokens opacos de 32 bytes en base64url', () => {
    const first = createInvitationToken()
    const second = createInvitationToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
  })

  it('guarda solo el hash SHA-256 del token', () => {
    const token = createInvitationToken()
    const hash = hashInvitationToken(token)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toBe(token)
    expect(hashInvitationToken(token)).toBe(hash)
  })

  it('expira a los 30 días', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const expiresAt = invitationExpiry(now)

    expect(expiresAt).toBe('2026-01-31T00:00:00.000Z')
    expect(INVITATION_TTL_DAYS).toBe(30)
    expect(isExpired(expiresAt, now)).toBe(false)
    expect(isExpired(expiresAt, new Date('2026-02-01T00:00:00.000Z'))).toBe(true)
  })

  it('calcula el estado efectivo', () => {
    const base = {
      status: 'enviada' as const,
      expiresAt: '2026-02-01T00:00:00.000Z'
    }
    const now = new Date('2026-01-15T00:00:00.000Z')

    expect(effectiveStatus(base, now)).toBe('enviada')
    expect(effectiveStatus(base, new Date('2026-03-01T00:00:00.000Z'))).toBe('expirada')
    expect(effectiveStatus({ ...base, status: 'canjeada' }, now)).toBe('canjeada')
  })
})
