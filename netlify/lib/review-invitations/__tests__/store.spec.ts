import { describe, expect, it } from 'vitest'
import type { ReviewClient, ReviewInvitation } from '../../../../src/types/review-invitations'
import {
  createMemoryClientStore,
  createMemoryInvitationStore
} from '../store'

const client: ReviewClient = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

function invitation(overrides: Partial<ReviewInvitation> = {}): ReviewInvitation {
  return {
    id: 'inv-1',
    clientId: 'client-1',
    tokenHash: 'a'.repeat(64),
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    status: 'enviada',
    history: [],
    ...overrides
  }
}

describe('review client store', () => {
  it('da de alta, edita, lista y elimina clientes', async () => {
    const store = createMemoryClientStore([client])

    expect(await store.listClients()).toHaveLength(1)
    expect(await store.getClient('client-1')).toEqual(client)

    await store.saveClient({ ...client, name: 'Ana María' })
    expect((await store.getClient('client-1'))?.name).toBe('Ana María')

    const other: ReviewClient = { ...client, id: 'client-2', name: 'Lupita' }
    await store.saveClient(other)
    expect((await store.listClients()).map((item) => item.id)).toEqual(['client-2', 'client-1'])

    await store.deleteClient('client-1')
    expect(await store.getClient('client-1')).toBeNull()
  })
})

describe('review invitation store', () => {
  it('guarda por hash, lee con etag y canjea con escritura condicional', async () => {
    const store = createMemoryInvitationStore([invitation()])

    expect(await store.getInvitation('a'.repeat(64))).toEqual(invitation())
    const withEtag = await store.getInvitationWithEtag('a'.repeat(64))
    expect(withEtag?.etag).toBeDefined()

    const redeemed = await store.saveInvitation(
      { ...invitation(), status: 'canjeada', reviewId: 'review-1' },
      { onlyIfMatch: withEtag?.etag }
    )
    expect(redeemed).toBe(true)
    expect((await store.getInvitation('a'.repeat(64)))?.status).toBe('canjeada')

    const stale = await store.saveInvitation(invitation(), { onlyIfMatch: 'etag-viejo' })
    expect(stale).toBe(false)
  })

  it('respeta onlyIfNew y elimina por cliente', async () => {
    const store = createMemoryInvitationStore()

    expect(await store.saveInvitation(invitation(), { onlyIfNew: true })).toBe(true)
    expect(await store.saveInvitation(invitation(), { onlyIfNew: true })).toBe(false)

    await store.deleteByClient('client-1')
    expect(await store.listInvitations()).toHaveLength(0)
  })
})
