# Tests de `add-review-invitations`

Contenido de los archivos de prueba del cambio. Cópialos después del código de `MANUAL-FILES-REVIEW-INVITATIONS.md`.

---

## 1. CREAR `netlify/lib/review-invitations/__tests__/token.spec.ts`

```ts
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
```

---

## 2. CREAR `netlify/lib/review-invitations/__tests__/store.spec.ts`

```ts
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
```

---

## 3. CREAR `netlify/lib/review-invitations/__tests__/validation.spec.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { ReviewClient } from '../../../../src/types/review-invitations'
import {
  isValidInvitationToken,
  normalizeWhatsapp,
  validateChannels,
  validateClientInput
} from '../validation'

const client: ReviewClient = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('validateClientInput', () => {
  it('acepta nombre y un solo medio de contacto', () => {
    const result = validateClientInput({ name: ' Ana ', email: 'ANA@Example.com', whatsapp: '' })

    expect(result).toEqual({
      ok: true,
      value: { name: 'Ana', email: 'ana@example.com', whatsapp: '' }
    })
  })

  it('normaliza el WhatsApp a dígitos con código de país', () => {
    const result = validateClientInput({ name: 'Ana', email: '', whatsapp: '+52 (56) 3127-0122' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.whatsapp).toBe('525631270122')
  })

  it('rechaza contacto inválido y falta de medios', () => {
    const invalid = validateClientInput({ name: 'Ana', email: 'correo', whatsapp: '123' })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(Object.keys(invalid.fields).sort()).toEqual(['email', 'whatsapp'])

    const empty = validateClientInput({ name: 'Ana', email: '', whatsapp: '' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.fields.email).toMatch(/correo o un número/)
  })
})

describe('validateChannels', () => {
  it('dedupe canales y respeta los medios del cliente', () => {
    expect(validateChannels(['email', 'email', 'whatsapp'], client)).toEqual({
      ok: true,
      value: ['email', 'whatsapp']
    })
    expect(validateChannels([], client).ok).toBe(false)
    expect(validateChannels(['whatsapp'], { ...client, whatsapp: '' }).ok).toBe(false)
  })
})

describe('isValidInvitationToken', () => {
  it('acepta tokens opacos y rechaza basura', () => {
    expect(isValidInvitationToken('a'.repeat(43))).toBe(true)
    expect(isValidInvitationToken('short')).toBe(false)
    expect(isValidInvitationToken(123)).toBe(false)
    expect(normalizeWhatsapp('+52 56')).toBe('5256')
  })
})
```

---

## 4. CREAR `netlify/lib/review-invitations/__tests__/messaging.spec.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import { createInvitationSender } from '../messaging'

function okResponse(id = 'msg_1') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ id }),
    text: async () => ''
  }
}

describe('createInvitationSender', () => {
  it('envía por Resend con la liga y el remitente configurado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse())
    const sender = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      resendApiKey: 're_key',
      fromEmail: 'hola@example.com'
    })

    const result = await sender.sendEmail({
      to: 'ana@example.com',
      name: 'Ana',
      link: 'https://origenconsciente.mx/resenas?token=abc'
    })

    expect(result).toEqual({ ok: true, providerMessageId: 'msg_1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_key')
    expect(JSON.parse(init.body).to[0]).toBe('ana@example.com')
    expect(JSON.parse(init.body).html).toContain('https://origenconsciente.mx/resenas?token=abc')
  })

  it('envía por WhatsApp Cloud API usando la plantilla aprobada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse('wamid.1'))
    const sender = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      whatsappAccessToken: 'wa_token',
      whatsappPhoneNumberId: '123456'
    })

    const result = await sender.sendWhatsApp({
      to: '525631270122',
      name: 'Ana',
      link: 'https://origenconsciente.mx/resenas?token=abc'
    })

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v20.0/123456/messages')
    const body = JSON.parse(init.body)
    expect(body.template.name).toBe('review_invitation')
    expect(body.template.components[0].parameters[1].text).toContain('token=abc')
  })

  it('deshabilita canales sin credenciales y reporta errores del proveedor', async () => {
    const sender = createInvitationSender()
    expect(sender.emailConfigured).toBe(false)
    expect(sender.whatsappConfigured).toBe(false)

    const email = await sender.sendEmail({ to: 'a@b.com', name: 'A', link: 'l' })
    expect(email.ok).toBe(false)
    expect(email.error).toMatch(/no está configurado/)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request'
    })
    const failing = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      resendApiKey: 're_key',
      fromEmail: 'hola@example.com'
    })
    const failed = await failing.sendEmail({ to: 'a@b.com', name: 'A', link: 'l' })
    expect(failed.ok).toBe(false)
    expect(failed.error).toContain('400')
    expect(failed.error).not.toContain('re_key')
  })
})
```

---

## 5. CREAR `netlify/lib/review-invitations/__tests__/clients-handler.spec.ts`

```ts
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
```

---

## 6. CREAR `netlify/lib/review-invitations/__tests__/invitations-handler.spec.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import type { InvitationSender } from '../messaging'
import { createSessionToken } from '../../blog/auth'
import type { ReviewClient } from '../../../types/review-invitations'
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
    const body = await response.json()

    expect(body).toEqual({ invitations: [], channels: { email: true, whatsapp: false } })
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

    const body = await response.json()
    expect(body.link).toMatch(/^https:\/\/origenconsciente\.mx\/resenas\?token=/)
    expect(body.results).toHaveLength(2)
    expect(body.status).toBe('enviada')
    expect(messageSender.sendEmail).toHaveBeenCalledTimes(1)
    expect(messageSender.sendWhatsApp).toHaveBeenCalledTimes(1)

    const listed = await (await handle(request('/api/admin/review-invitations'))).json()
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
    const body = await response.json()

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
    const body = await response.json()

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
```

---

## 7. CREAR `netlify/lib/review-invitations/__tests__/public-invitation.spec.ts`

```ts
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
```

---

## 8. CREAR `src/services/__tests__/admin-review-invitations.spec.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AdminReviewApiError,
  createClient,
  listClients,
  listInvitations,
  sendInvitation
} from '../adminReviewInvitations'

afterEach(() => vi.unstubAllGlobals())

describe('admin review invitations service', () => {
  it('usa credenciales same-origin para listar clientes', async () => {
    const data = { clients: [] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => data
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(listClients()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/review-clients', {
      headers: expect.any(Headers),
      credentials: 'same-origin'
    })
  })

  it('envía el alta de cliente como JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ client: { id: '1' }, message: 'Cliente registrado.' })
    })
    vi.stubGlobal('fetch', fetchMock)

    await createClient({ name: 'Ana', email: 'ana@example.com', whatsapp: '' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', email: 'ana@example.com', whatsapp: '' })
  })

  it('expone errores tipados y el estado de los canales', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Sesión no válida o expirada.' })
      })
    )
    await expect(listInvitations()).rejects.toMatchObject({
      status: 401,
      message: 'Sesión no válida o expirada.'
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          invitations: [],
          channels: { email: true, whatsapp: false }
        })
      })
    )
    expect(await listInvitations()).toEqual({
      invitations: [],
      channels: { email: true, whatsapp: false }
    })

    expect(AdminReviewApiError.name).toBe('AdminReviewApiError')
  })

  it('publica el cuerpo del envío de liga', async () => {
    const result = { invitationId: 'inv-1', link: 'l', status: 'enviada', results: [], message: 'ok' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => result
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendInvitation({ clientId: 'client-1', channels: ['email'] })
    ).resolves.toEqual(result)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ clientId: 'client-1', channels: ['email'] })
  })
})
```

---

## 9. REEMPLAZAR `src/views/__tests__/reviews-view.spec.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter } from 'vue-router'
import ReviewsView from '../ReviewsView.vue'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const listResponse = {
  reviews: [
    {
      id: '1',
      name: 'Ana López',
      rating: 5,
      message: 'Una experiencia muy clara y respetuosa.',
      createdAt: '2026-01-01T12:00:00.000Z'
    }
  ],
  summary: { average: 5, count: 1 }
}

async function renderView(token?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/resenas', component: ReviewsView }]
  })
  await router.push(token ? `/resenas?token=${token}` : '/resenas')
  await router.isReady()

  return render(ReviewsView, { global: { plugins: [router, createTestHead()] } })
}

function mockFetch(options: { valid?: boolean; failCheck?: boolean } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/api/reviews/invitation')) {
      if (options.failCheck) return Promise.reject(new Error('offline'))
      return Promise.resolve({
        ok: true,
        json: async () => ({ valid: options.valid ?? false })
      })
    }
    if (init?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({
          review: listResponse.reviews[0],
          status: 'approved',
          message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
        })
      })
    }
    return Promise.resolve({ ok: true, json: async () => listResponse })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ReviewsView', () => {
  it('muestra el resumen y oculta el formulario sin token', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    expect(screen.getByText('5.0')).toBeInTheDocument()
    expect(screen.getByText('1 reseña publicada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
    expect(screen.getByText(/Publicamos las experiencias/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/reviews/invitation'),
      expect.anything()
    )
  })

  it('muestra el formulario con un token vigente y envía el token', async () => {
    const fetchMock = mockFetch({ valid: true })
    await renderView('token-valido-de-prueba-1234567890')

    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Tu nombre'), 'María')
    await user.click(screen.getByRole('radio', { name: '4 de 5 estrellas' }))
    await user.type(screen.getByLabelText('Tu reseña'), 'Me sentí acompañada durante todo el proceso.')
    await user.click(screen.getByLabelText('Acepto que mi reseña se publique en el sitio.'))
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Tu reseña ya está publicada.')
    )

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST')
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      invitationToken: 'token-valido-de-prueba-1234567890'
    })
  })

  it('oculta el formulario con un token inválido', async () => {
    mockFetch({ valid: false })
    await renderView('token-invalido-de-prueba-123456')

    await waitFor(() =>
      expect(screen.getByText(/Esta liga ya no es válida/)).toBeInTheDocument()
    )
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
  })

  it('muestra error si falla la validación de la invitación', async () => {
    mockFetch({ failCheck: true })
    await renderView('token-valido-de-prueba-1234567890')

    await waitFor(() =>
      expect(screen.getByText(/No pudimos validar la invitación/)).toBeInTheDocument()
    )
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
  })

  it('muestra error y permite reintentar si falla el listado', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ok: true, json: async () => listResponse })
    vi.stubGlobal('fetch', fetchMock)
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos conectar con el servicio de reseñas.'
      )
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
  })
})
```

---

## 10. EDITAR `src/components/sections/__tests__/review-form.spec.ts`

Todas las llamadas `render(ReviewForm)` deben pasar el token. Sustituye cada una por:

```ts
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })
```

y la que captura `emitted`:

```ts
    const { emitted } = render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })
```

Además, en la prueba «envía una reseña válida…», agrega después de `expect(fetchMock).toHaveBeenCalledTimes(1)`:

```ts
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body as string)).toMatchObject({
      invitationToken: 'token-de-prueba-valido'
    })
```

Y agrega esta prueba al final del `describe`:

```ts
  it('no envía sin token de invitación', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: '' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/liga ya no es válida/)
  })
```

---

## 11. CREAR `tests/e2e/admin-reviews.spec.ts`

```ts
import { expect, test, type Page, type Route } from '@playwright/test'

interface MockClient {
  id: string
  name: string
  email: string
  whatsapp: string
  createdAt: string
  updatedAt: string
}

async function mockAdminApi(page: Page) {
  let authenticated = false
  const clients: MockClient[] = []
  const sends: Array<Record<string, unknown>> = []
  let providerError = false

  await page.route('**/api/admin/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const body = async () => {
      try {
        return (await request.postDataJSON()) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    const fulfill = (status: number, payload: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      })

    if (url.pathname === '/api/admin/session') {
      return fulfill(authenticated ? 200 : 401, { authenticated })
    }
    if (url.pathname === '/api/admin/login') {
      authenticated = true
      return fulfill(200, { ok: true })
    }
    if (url.pathname === '/api/admin/logout') {
      authenticated = false
      return fulfill(200, { ok: true })
    }
    if (url.pathname === '/api/admin/review-clients') {
      if (!authenticated) return fulfill(401, { error: 'Sesión no válida o expirada.' })

      if (method === 'GET') return fulfill(200, { clients })

      if (method === 'POST') {
        const input = await body()
        const now = new Date().toISOString()
        const client: MockClient = {
          id: `client-${clients.length + 1}`,
          name: String(input.name ?? ''),
          email: String(input.email ?? ''),
          whatsapp: String(input.whatsapp ?? ''),
          createdAt: now,
          updatedAt: now
        }
        clients.push(client)
        return fulfill(201, { client, message: 'Cliente registrado.' })
      }
    }
    if (url.pathname === '/api/admin/review-invitations') {
      if (!authenticated) return fulfill(401, { error: 'Sesión no válida o expirada.' })

      if (method === 'GET') {
        return fulfill(200, {
          invitations: [],
          channels: { email: true, whatsapp: true }
        })
      }
      if (method === 'POST') {
        const input = await body()
        sends.push(input)
        const channels = (input.channels as string[]) ?? []
        return fulfill(200, {
          invitationId: 'inv-1',
          link: 'https://origenconsciente.mx/resenas?token=token-e2e',
          status: providerError ? 'pendiente' : 'enviada',
          results: channels.map((channel) => ({
            channel,
            ok: !providerError,
            ...(providerError ? { error: 'Proveedor rechazado' } : {})
          })),
          message: providerError ? 'No se pudo enviar la liga.' : 'Liga enviada.'
        })
      }
    }

    return fulfill(404, { error: 'Ruta no encontrada.' })
  })

  return {
    failProvider() {
      providerError = true
    },
    sends
  }
}

test('pide login y gestiona clientes e invitaciones', async ({ page }) => {
  const api = await mockAdminApi(page)

  await page.goto('/admin/resenas')
  await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Reseñas por invitación' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.getByLabel('Nombre').fill('Ana López')
  await page.getByLabel('Correo electrónico').fill('ana@example.com')
  await page.getByLabel('WhatsApp (con código de país)').fill('525631270122')
  await page.getByRole('button', { name: 'Guardar cliente' }).click()

  await expect(page.getByText('Ana López')).toBeVisible()

  await page.getByRole('button', { name: 'Elegir' }).click()
  await page.getByLabel('Correo').check()
  await page.getByLabel('WhatsApp').check()
  await page.getByRole('button', { name: 'ENVIAR LIGA' }).click()

  await expect(page.getByRole('heading', { name: 'Resultado del envío' })).toBeVisible()
  await expect(page.getByText(/correo: enviado/)).toBeVisible()
  expect(api.sends[0]).toMatchObject({
    clientId: 'client-1',
    channels: ['email', 'whatsapp']
  })
})

test('muestra el error del proveedor y permite reintentar', async ({ page }) => {
  const api = await mockAdminApi(page)
  api.failProvider()

  await page.goto('/admin/resenas')
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.getByLabel('Nombre').fill('Ana López')
  await page.getByLabel('Correo electrónico').fill('ana@example.com')
  await page.getByRole('button', { name: 'Guardar cliente' }).click()
  await page.getByRole('button', { name: 'Elegir' }).click()
  await page.getByLabel('Correo').check()
  await page.getByRole('button', { name: 'ENVIAR LIGA' }).click()

  await expect(page.getByText(/Proveedor rechazado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENVIAR LIGA' })).toBeEnabled()
})
```

---

## Verificación

```bash
npx vitest run netlify/lib/review-invitations
npx vitest run netlify/lib/reviews
npx vitest run src/services/__tests__/reviews.spec.ts
npx vitest run src/services/__tests__/admin-review-invitations.spec.ts
npx vitest run src/views/__tests__/reviews-view.spec.ts
npx vitest run src/components/sections/__tests__/review-form.spec.ts
npx playwright test tests/e2e/reviews.spec.ts tests/e2e/admin-reviews.spec.ts tests/e2e/a11y.spec.ts
```

Si un test de `reviews.spec.ts` (E2E) falla porque el listado ya no incluye formulario, actualízalo para crear una invitación simulada en el mock de `/api/reviews/invitation` y para incluir `invitationToken` en el cuerpo esperado del `POST /api/reviews`.
