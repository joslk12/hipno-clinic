import { describe, expect, it, vi } from 'vitest'
import type { InvitationSender } from '../messaging'
import { createSessionToken } from '../../blog/auth'
import type { ReviewClient } from '../../../../src/types/review-invitations'
import { createReviewInvitationsHandler } from '../handlers'
import { createMemoryClientStore, createMemoryInvitationStore } from '../store'
import { hashInvitationToken } from '../token'

const SECRET = 'session-secret'
const client: ReviewClient = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

function sender(overrides: Partial<InvitationSender> = {}): InvitationSender {
  return {
    emailConfigured: true,
    whatsappConfigured: true,
    sendEmail: vi.fn().mockResolvedValue({ ok: true, providerMessageId: 'e1' }),
    sendWhatsApp: vi.fn().mockResolvedValue({ ok: true, providerMessageId: 'w1' }),
    ...overrides
  }
}

interface SendBody {
  link: string
  results: Array<{ ok: boolean; error?: string }>
  status: string
  whatsapp?: { text: string; url: string }
}

interface ListBody {
  invitations: Array<{ history: unknown[] }>
  channels: { email: boolean; whatsapp: boolean }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cookie', `oc_admin_session=${createSessionToken(SECRET)}`)
  return new Request(`https://example.com${path}`, { ...init, headers })
}

function setup(messageSender = sender(), seed: Parameters<typeof createMemoryInvitationStore>[0] = []) {
  const clientStore = createMemoryClientStore([client])
  const invitationStore = createMemoryInvitationStore(seed)
  const handle = createReviewInvitationsHandler({
    clientStore,
    invitationStore,
    sender: messageSender,
    siteUrl: 'https://origenconsciente.mx',
    sessionSecret: SECRET
  })
  return { handle, invitationStore, clientStore }
}

describe('invitations handler', () => {
  it('lista invitaciones y estado de canales', async () => {
    const { handle } = setup(sender({ whatsappConfigured: false }))
    const response = await handle(request('/api/admin/review-invitations'))
    const body = await readJson<ListBody>(response)

    expect(body).toEqual({ invitations: [], channels: { email: true, whatsapp: false } })
  })

  it('genera un mensaje de WhatsApp listo para copiar sin usar la API', async () => {
    const messageSender = sender({ whatsappConfigured: false })
    const { handle } = setup(messageSender)

    const response = await handle(
      request('/api/admin/review-invitations', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-1', channels: [], generateWhatsapp: true })
      })
    )
    expect(response.status).toBe(200)

    const body = await readJson<SendBody>(response)
    expect(body.status).toBe('pendiente')
    expect(body.results).toHaveLength(0)
    expect(messageSender.sendWhatsApp).not.toHaveBeenCalled()
    expect(body.whatsapp?.text).toContain('Ana López')
    expect(body.whatsapp?.url).toMatch(/^https:\/\/wa\.me\/525631270122\?text=/)
  })

  it('envía por ambos canales y guarda el historial', async () => {
    const messageSender = sender()
    const { handle } = setup(messageSender)

    const response = await handle(
      request('/api/admin/review-invitations', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-1', channels: ['email', 'whatsapp'] })
      })
    )
    expect(response.status).toBe(200)

    const body = await readJson<SendBody>(response)
    expect(body.link).toMatch(/^https:\/\/origenconsciente\.mx\/resenas\?token=/)
    expect(body.results).toHaveLength(2)
    expect(body.status).toBe('enviada')
    expect(messageSender.sendEmail).toHaveBeenCalledTimes(1)
    expect(messageSender.sendWhatsApp).toHaveBeenCalledTimes(1)

    const listed = await readJson<ListBody>(await handle(request('/api/admin/review-invitations')))
    expect(listed.invitations[0].history).toHaveLength(2)
  })

  it('no marca como enviada si falla el proveedor', async () => {
    const messageSender = sender({
      sendEmail: vi.fn().mockResolvedValue({ ok: false, error: 'rechazado' })
    })
    const { handle } = setup(messageSender)

    const response = await handle(
      request('/api/admin/review-invitations', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-1', channels: ['email'] })
      })
    )
    const body = await readJson<SendBody>(response)

    expect(body.status).toBe('pendiente')
    expect(body.results[0]).toMatchObject({ ok: false, error: 'rechazado' })
  })

  it('el reenvío genera token nuevo y deja inactiva la anterior', async () => {
    const previous = {
      id: 'inv-old',
      clientId: 'client-1',
      tokenHash: 'b'.repeat(64),
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-02-01T00:00:00.000Z',
      status: 'canjeada' as const,
      history: []
    }
    const { handle, invitationStore } = setup(sender(), [previous])

    const response = await handle(
      request('/api/admin/review-invitations', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-1',
          channels: ['email'],
          invitationId: 'inv-old'
        })
      })
    )
    const body = await readJson<SendBody>(response)

    expect(hashInvitationToken(new URL(body.link).searchParams.get('token') ?? '')).not.toBe(
      previous.tokenHash
    )
    expect((await invitationStore.getInvitation(previous.tokenHash))?.status).toBe('expirada')
  })

  it('rechaza canales sin medio registrado', async () => {
    const { handle } = setup()
    const response = await handle(
      request('/api/admin/review-invitations', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-1', channels: ['fax'] })
      })
    )
    expect(response.status).toBe(400)
  })
})
