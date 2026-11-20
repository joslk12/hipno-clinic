import { describe, expect, it } from 'vitest'
import type { ReviewInvitation } from '../../../../src/types/review-invitations'
import { createPublicInvitationHandler } from '../handlers'
import { createMemoryInvitationStore } from '../store'
import { createInvitationToken, hashInvitationToken } from '../token'

const token = createInvitationToken()

function handle(seed: Parameters<typeof createMemoryInvitationStore>[0] = []) {
  return createPublicInvitationHandler({
    invitationStore: createMemoryInvitationStore(seed),
    now: () => new Date('2026-01-15T00:00:00.000Z')
  })
}

function invitation(overrides: Partial<ReviewInvitation> = {}): ReviewInvitation {
  return {
    id: 'inv-1',
    clientId: 'client-1',
    tokenHash: hashInvitationToken(token),
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    status: 'enviada',
    history: [],
    ...overrides
  }
}

describe('public invitation handler', () => {
  it('no expone datos del cliente', async () => {
    const response = await handle([invitation()])(
      new Request(`https://example.com/api/reviews/invitation?token=${token}`)
    )
    const body = await response.json()

    expect(body).toEqual({ valid: true })
    expect(JSON.stringify(body)).not.toContain('client-1')
  })

  it('rechaza tokens ausentes, inválidos, canjeados y expirados', async () => {
    const cases = [
      { url: 'https://example.com/api/reviews/invitation', seed: [] },
      { url: 'https://example.com/api/reviews/invitation?token=bad', seed: [] },
      { url: `https://example.com/api/reviews/invitation?token=${token}`, seed: [invitation({ status: 'canjeada' })] },
      { url: `https://example.com/api/reviews/invitation?token=${token}`, seed: [invitation({ expiresAt: '2026-01-01T00:00:00.000Z' })] }
    ]

    for (const item of cases) {
      const response = await handle(item.seed)(new Request(item.url))
      expect(await response.json()).toEqual({ valid: false })
    }
  })

  it('solo permite GET', async () => {
    const response = await handle()(
      new Request('https://example.com/api/reviews/invitation', { method: 'POST' })
    )
    expect(response.status).toBe(405)
  })
})
