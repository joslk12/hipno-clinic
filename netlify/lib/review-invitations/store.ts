import { getStore } from '@netlify/blobs'
import type { ReviewClient, ReviewInvitation } from '../../../src/types/review-invitations'

export interface ClientStore {
  listClients(): Promise<ReviewClient[]>
  getClient(id: string): Promise<ReviewClient | null>
  saveClient(client: ReviewClient): Promise<void>
  deleteClient(id: string): Promise<void>
}

export interface InvitationWithEtag {
  invitation: ReviewInvitation
  etag?: string
}

export interface InvitationWriteOptions {
  onlyIfNew?: boolean
  onlyIfMatch?: string
}

export interface InvitationStore {
  listInvitations(): Promise<ReviewInvitation[]>
  getInvitation(tokenHash: string): Promise<ReviewInvitation | null>
  getInvitationWithEtag(tokenHash: string): Promise<InvitationWithEtag | null>
  getInvitationById(id: string): Promise<ReviewInvitation | null>
  /** Devuelve false si la escritura condicional no se pudo aplicar. */
  saveInvitation(invitation: ReviewInvitation, options?: InvitationWriteOptions): Promise<boolean>
  deleteInvitation(id: string): Promise<void>
  deleteByClient(clientId: string): Promise<void>
}

function sortNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createBlobReviewClientStore(name = 'clients'): ClientStore {
  const store = getStore({ name, consistency: 'strong' })

  return {
    async listClients() {
      const { blobs } = await store.list({ prefix: 'client:' })
      const clients = await Promise.all(
        blobs.map(({ key }) => store.get(key, { type: 'json' }) as Promise<ReviewClient | null>)
      )
      return sortNewest(clients.filter((client): client is ReviewClient => client !== null))
    },
    async getClient(id) {
      return (await store.get(`client:${id}`, { type: 'json' })) as ReviewClient | null
    },
    async saveClient(client) {
      await store.setJSON(`client:${client.id}`, client)
    },
    async deleteClient(id) {
      await store.delete(`client:${id}`)
    }
  }
}

export function createBlobInvitationStore(name = 'review-invitations'): InvitationStore {
  const store = getStore({ name, consistency: 'strong' })

  return {
    async listInvitations() {
      const { blobs } = await store.list({ prefix: 'invitation:' })
      const invitations = await Promise.all(
        blobs.map(({ key }) => store.get(key, { type: 'json' }) as Promise<ReviewInvitation | null>)
      )
      return sortNewest(
        invitations.filter((invitation): invitation is ReviewInvitation => invitation !== null)
      )
    },
    async getInvitation(tokenHash) {
      return (await store.get(`invitation:${tokenHash}`, { type: 'json' })) as ReviewInvitation | null
    },
    async getInvitationWithEtag(tokenHash) {
      const result = await store.getWithMetadata(`invitation:${tokenHash}`, { type: 'json' })
      if (!result) return null
      return { invitation: result.data as ReviewInvitation, etag: result.etag }
    },
    async getInvitationById(id) {
      const all = await this.listInvitations()
      return all.find((invitation) => invitation.id === id) ?? null
    },
    async saveInvitation(invitation, options) {
      const key = `invitation:${invitation.tokenHash}`

      if (options?.onlyIfMatch) {
        const result = await store.setJSON(key, invitation, { onlyIfMatch: options.onlyIfMatch })
        return result.modified
      }
      if (options?.onlyIfNew) {
        const result = await store.setJSON(key, invitation, { onlyIfNew: true })
        return result.modified
      }

      const result = await store.setJSON(key, invitation)
      return result.modified
    },
    async deleteInvitation(id) {
      const invitation = await this.getInvitationById(id)
      if (invitation) await store.delete(`invitation:${invitation.tokenHash}`)
    },
    async deleteByClient(clientId) {
      const invitations = await this.listInvitations()
      await Promise.all(
        invitations
          .filter((invitation) => invitation.clientId === clientId)
          .map((invitation) => store.delete(`invitation:${invitation.tokenHash}`))
      )
    }
  }
}

export function createMemoryClientStore(seed: ReviewClient[] = []): ClientStore {
  const clients = new Map(seed.map((client) => [client.id, client]))

  return {
    async listClients() {
      return [...clients.values()].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          b.updatedAt.localeCompare(a.updatedAt) ||
          b.id.localeCompare(a.id)
      )
    },
    async getClient(id) {
      return clients.get(id) ?? null
    },
    async saveClient(client) {
      clients.set(client.id, client)
    },
    async deleteClient(id) {
      clients.delete(id)
    }
  }
}

export function createMemoryInvitationStore(seed: ReviewInvitation[] = []): InvitationStore {
  interface Entry {
    invitation: ReviewInvitation
    etag: string
  }

  const entries = new Map<string, Entry>(
    seed.map((invitation, index) => [invitation.tokenHash, { invitation, etag: `etag-${index + 1}` }])
  )
  let version = seed.length + 1

  return {
    async listInvitations() {
      return sortNewest([...entries.values()].map((entry) => entry.invitation))
    },
    async getInvitation(tokenHash) {
      return entries.get(tokenHash)?.invitation ?? null
    },
    async getInvitationWithEtag(tokenHash) {
      const entry = entries.get(tokenHash)
      return entry ? { invitation: entry.invitation, etag: entry.etag } : null
    },
    async getInvitationById(id) {
      return [...entries.values()].map((entry) => entry.invitation).find((item) => item.id === id) ?? null
    },
    async saveInvitation(invitation, options) {
      const current = entries.get(invitation.tokenHash)

      if (options?.onlyIfNew && current) return false
      if (options?.onlyIfMatch && (!current || current.etag !== options.onlyIfMatch)) return false

      entries.set(invitation.tokenHash, { invitation, etag: `etag-${version++}` })
      return true
    },
    async deleteInvitation(id) {
      const found = [...entries.entries()].find(([, entry]) => entry.invitation.id === id)
      if (found) entries.delete(found[0])
    },
    async deleteByClient(clientId) {
      for (const [key, entry] of [...entries.entries()]) {
        if (entry.invitation.clientId === clientId) entries.delete(key)
      }
    }
  }
}
