import { describe, expect, it } from 'vitest'
import { createSessionToken } from '../../blog/auth'
import { createReviewClientsHandler } from '../handlers'
import { createMemoryClientStore } from '../store'

const SECRET = 'session-secret'

function request(path: string, init: RequestInit = {}, authenticated = true) {
  const headers = new Headers(init.headers)
  if (authenticated) {
    headers.set('cookie', `oc_admin_session=${createSessionToken(SECRET)}`)
  }
  return new Request(`https://example.com${path}`, { ...init, headers })
}

function handler() {
  const store = createMemoryClientStore()
  return { store, handle: createReviewClientsHandler({ store, sessionSecret: SECRET }) }
}

describe('clients handler', () => {
  it('rechaza visitantes anónimos y sesión sin configurar', async () => {
    const { handle } = handler()

    expect((await handle(request('/api/admin/review-clients', {}, false))).status).toBe(401)

    const noSecret = createReviewClientsHandler({ store: createMemoryClientStore() })
    expect((await noSecret(request('/api/admin/review-clients'))).status).toBe(503)
  })

  it('da de alta, lista, edita y elimina', async () => {
    const { handle } = handler()

    const created = await handle(
      request('/api/admin/review-clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', whatsapp: '' })
      })
    )
    expect(created.status).toBe(201)
    const { client } = (await created.json()) as { client: { id: string } }

    const listed = await (await handle(request('/api/admin/review-clients'))).json()
    expect(listed).toMatchObject({ clients: [{ id: client.id }] })

    const updated = await handle(
      request(`/api/admin/review-clients?id=${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Ana María' })
      })
    )
    expect(updated.status).toBe(200)
    expect((await updated.json())).toMatchObject({ client: { name: 'Ana María' } })

    const removed = await handle(
      request(`/api/admin/review-clients?id=${client.id}`, { method: 'DELETE' })
    )
    expect(removed.status).toBe(200)
  })

  it('devuelve errores por campo', async () => {
    const { handle } = handler()
    const response = await handle(
      request('/api/admin/review-clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', email: '', whatsapp: '' })
      })
    )

    expect(response.status).toBe(400)
    expect((await response.json())).toMatchObject({ fields: { name: expect.any(String) } })
  })
})
