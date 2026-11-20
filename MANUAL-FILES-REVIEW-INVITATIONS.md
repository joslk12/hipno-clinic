# Archivos de `add-review-invitations` — contenido paso a paso

Este documento complementa `MANUAL-IMPLEMENTATION.md`. Aquí está el **contenido real** de cada archivo que hay que crear o editar, en el orden en que conviene hacerlo.

Convenciones:

- **CREAR** = archivo nuevo, pega el bloque completo.
- **EDITAR** = archivo existente; se indica la sustitución exacta o el bloque nuevo completo.
- No marques el checkbox de `tasks.md` hasta que pase el comando de verificación de ese paso.
- Todos los comandos se ejecutan desde la raíz del proyecto.

---

# PASO 1 — Contratos y configuración

Objetivo: tipos compartidos, variables de entorno y CSP. Verifica con `npm run typecheck` y `npx playwright test tests/e2e/network.spec.ts`.

## 1.1 CREAR `src/types/review-invitations.ts`

```ts
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
```

## 1.2 EDITAR `src/types/reviews.ts`

Sustituye la interfaz `CreateReviewPayload` por esta:

```ts
export interface CreateReviewPayload {
  name: string
  rating: number
  message: string
  consent: boolean
  honeypot?: string
  invitationToken: string
}
```

> El token es obligatorio a nivel de tipo para que ninguna llamada desde el frontend pueda omitirlo.

## 1.3 EDITAR `.env.example`

Agrega estas cuatro líneas al final:

```dotenv
RESEND_API_KEY=re_replace_me
REVIEWS_FROM_EMAIL=Origen Consciente <hola@origenconsciente.mx>
WHATSAPP_ACCESS_TOKEN=replace-me
WHATSAPP_PHONE_NUMBER_ID=replace-me
```

## 1.4 EDITAR `public/_headers`

Sustituye únicamente el fragmento `connect-src 'self';` de la línea 2:

```diff
- font-src 'self'; connect-src 'self'; frame-src
+ font-src 'self'; connect-src 'self' https://api.resend.com https://graph.facebook.com; frame-src
```

La línea completa debe quedar así:

```text
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.resend.com https://graph.facebook.com; frame-src https://www.google.com https://maps.google.com https://consent.google.com; form-action 'self'; upgrade-insecure-requests
```

> No hace falta editar `vite.config.ts`: `includedRoutes` ya excluye todo lo que empieza por `/admin`.

Verificación del paso 1:

```bash
npm run typecheck
npm run build
npx playwright test tests/e2e/network.spec.ts
```

Checkbox: `tasks.md` 1.1, 1.2, 1.3.

---

# PASO 2 — Token y stores

## 2.1 CREAR `netlify/lib/review-invitations/token.ts`

```ts
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
```

## 2.2 CREAR `netlify/lib/review-invitations/store.ts`

```ts
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
      return sortNewest([...clients.values()])
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
```

Verificación del paso 2:

```bash
npm run typecheck
npx vitest run netlify/lib/review-invitations/__tests__/token.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/store.spec.ts
```

Checkboxes: `tasks.md` 2.1, 2.2, 2.3.

---

# PASO 3 — Validación y envío de mensajes

## 3.1 CREAR `netlify/lib/review-invitations/validation.ts`

```ts
import type { InvitationChannel, ReviewClient } from '../../../src/types/review-invitations'

export interface ValidClientInput {
  name: string
  email: string
  whatsapp: string
}

export type ClientValidationResult =
  | { ok: true; value: ValidClientInput }
  | { ok: false; fields: Record<string, string> }

export type ChannelsValidation =
  | { ok: true; value: InvitationChannel[] }
  | { ok: false; error: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeWhatsapp(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

export function isValidInvitationToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}

export function validateClientInput(input: unknown): ClientValidationResult {
  if (!isRecord(input)) {
    return { ok: false, fields: { form: 'La solicitud no es válida.' } }
  }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const whatsapp = typeof input.whatsapp === 'string' ? normalizeWhatsapp(input.whatsapp) : ''
  const fields: Record<string, string> = {}

  if (name.length < 2 || name.length > 80) {
    fields.name = 'Escribe un nombre de 2 a 80 caracteres.'
  }
  if (email && !isValidEmail(email)) {
    fields.email = 'Escribe un correo electrónico válido.'
  }
  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) {
    fields.whatsapp = 'Escribe un número de WhatsApp válido con código de país.'
  }
  if (!email && !whatsapp) {
    fields.email = 'Registra un correo o un número de WhatsApp.'
    fields.whatsapp = 'Registra un correo o un número de WhatsApp.'
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields }
  return { ok: true, value: { name, email, whatsapp } }
}

export function validateChannels(input: unknown, client: ReviewClient): ChannelsValidation {
  const channels = Array.isArray(input)
    ? [...new Set(input.filter((item): item is InvitationChannel => item === 'email' || item === 'whatsapp'))]
    : []

  if (channels.length === 0) {
    return { ok: false, error: 'Elige al menos un canal de envío.' }
  }
  if (channels.includes('email') && !client.email) {
    return { ok: false, error: 'El cliente no tiene correo registrado.' }
  }
  if (channels.includes('whatsapp') && !client.whatsapp) {
    return { ok: false, error: 'El cliente no tiene WhatsApp registrado.' }
  }

  return { ok: true, value: channels }
}
```

## 3.2 CREAR `netlify/lib/review-invitations/messaging.ts`

```ts
export interface SendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

export interface SendMessageInput {
  to: string
  name: string
  link: string
}

export interface InvitationSender {
  readonly emailConfigured: boolean
  readonly whatsappConfigured: boolean
  sendEmail(input: SendMessageInput): Promise<SendResult>
  sendWhatsApp(input: SendMessageInput): Promise<SendResult>
}

export interface MessagingDeps {
  fetchImpl?: typeof fetch
  resendApiKey?: string
  fromEmail?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
}

export const WHATSAPP_TEMPLATE_NAME = 'review_invitation'
export const WHATSAPP_TEMPLATE_LANGUAGE = 'es_MX'

function message(link: string) {
  return `Hola, gracias por acompañarnos en Origen Consciente. Si gustas compartir tu experiencia, usa esta liga privada: ${link}`
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl: typeof fetch
): Promise<SendResult> {
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      const suffix = detail ? ` ${detail.slice(0, 200)}` : ''
      return { ok: false, error: `El proveedor rechazó el mensaje (${response.status}).${suffix}` }
    }

    let providerMessageId: string | undefined
    try {
      const data = (await response.json()) as { id?: string }
      providerMessageId = data.id
    } catch {
      providerMessageId = undefined
    }

    return { ok: true, providerMessageId }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido del proveedor.'
    }
  }
}

export function createInvitationSender(deps: MessagingDeps = {}): InvitationSender {
  const fetchImpl = deps.fetchImpl ?? fetch
  const emailConfigured = Boolean(deps.resendApiKey && deps.fromEmail)
  const whatsappConfigured = Boolean(deps.whatsappAccessToken && deps.whatsappPhoneNumberId)

  return {
    emailConfigured,
    whatsappConfigured,

    async sendEmail(input) {
      if (!emailConfigured) {
        return { ok: false, error: 'Resend no está configurado en este sitio.' }
      }

      return postJson(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${deps.resendApiKey}` },
        {
          from: deps.fromEmail,
          to: [input.to],
          subject: 'Tu liga privada para dejar una reseña | Origen Consciente',
          text: message(input.link).replace('Hola,', `Hola ${input.name},`),
          html: `<p>Hola ${escapeHtml(input.name)},</p><p>Gracias por acompañarnos en Origen Consciente. Si gustas compartir tu experiencia, usa esta liga privada:</p><p><a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a></p>`
        },
        fetchImpl
      )
    },

    async sendWhatsApp(input) {
      if (!whatsappConfigured) {
        return { ok: false, error: 'WhatsApp Cloud API no está configurada en este sitio.' }
      }

      return postJson(
        `https://graph.facebook.com/v20.0/${deps.whatsappPhoneNumberId}/messages`,
        { Authorization: `Bearer ${deps.whatsappAccessToken}` },
        {
          messaging_product: 'whatsapp',
          to: input.to,
          type: 'template',
          template: {
            name: WHATSAPP_TEMPLATE_NAME,
            language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: input.name },
                  { type: 'text', text: input.link }
                ]
              }
            ]
          }
        },
        fetchImpl
      )
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

> La plantilla de WhatsApp que debes registrar en Meta se llama `review_invitation`, idioma `es_MX`, con dos variables de cuerpo: `{{1}}` = nombre y `{{2}}` = liga.

## 3.3 CREAR `netlify/lib/review-invitations/runtime.ts`

```ts
import { createInvitationSender, type InvitationSender } from './messaging'
import {
  createBlobInvitationStore,
  createBlobReviewClientStore,
  type ClientStore,
  type InvitationStore
} from './store'

let clientStore: ClientStore | undefined
let invitationStore: InvitationStore | undefined
let sender: InvitationSender | undefined

export function getReviewClientStore(): ClientStore {
  if (!clientStore) clientStore = createBlobReviewClientStore()
  return clientStore
}

export function getReviewInvitationStore(): InvitationStore {
  if (!invitationStore) invitationStore = createBlobInvitationStore()
  return invitationStore
}

export function getInvitationSender(): InvitationSender {
  if (!sender) {
    sender = createInvitationSender({
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.REVIEWS_FROM_EMAIL,
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    })
  }
  return sender
}

export function getSiteUrl(): string {
  return (process.env.VITE_SITE_URL || process.env.URL || '').replace(/\/$/, '')
}
```

Verificación del paso 3:

```bash
npx vitest run netlify/lib/review-invitations/__tests__/validation.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/messaging.spec.ts
```

Checkboxes: `tasks.md` 3.1, 3.2, 3.3 (el 3.3 es documentación en README; ver PASO 8).

---

# PASO 4 — Handlers y Functions del panel

## 4.1 CREAR `netlify/lib/review-invitations/handlers.ts`

```ts
import { randomUUID } from 'node:crypto'
import type {
  InvitationSendRecord,
  ReviewClient,
  ReviewInvitation,
  ReviewInvitationView
} from '../../../src/types/review-invitations'
import { hasValidSession, isAllowedOrigin } from '../blog/auth'
import { adminJson, errorResponse, methodNotAllowed, publicJson, readJson } from '../blog/http'
import type { InvitationSender } from './messaging'
import type { ClientStore, InvitationStore } from './store'
import {
  createInvitationToken,
  effectiveStatus,
  hashInvitationToken,
  invitationExpiry
} from './token'
import { isValidInvitationToken, validateChannels, validateClientInput } from './validation'

export interface AdminHandlerOptions {
  sessionSecret?: string
  now?: () => Date
  generateId?: () => string
}

export interface ClientsHandlerOptions extends AdminHandlerOptions {
  store: ClientStore
}

export interface InvitationsHandlerOptions extends AdminHandlerOptions {
  clientStore: ClientStore
  invitationStore: InvitationStore
  sender: InvitationSender
  siteUrl: string
}

export interface PublicInvitationHandlerOptions {
  invitationStore: InvitationStore
  now?: () => Date
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireAdmin(request: Request, sessionSecret: string | undefined): Response | null {
  if (!sessionSecret) {
    return errorResponse(503, 'La administración de reseñas no está configurada.')
  }
  if (!hasValidSession(request, sessionSecret)) {
    return errorResponse(401, 'Sesión no válida o expirada.')
  }
  if (!isAllowedOrigin(request)) {
    return errorResponse(403, 'Origen no permitido.')
  }
  return null
}

function sortNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function logError(scope: string, error: unknown) {
  console.error(`${scope}:`, error instanceof Error ? error.message : 'unknown error')
}

/* ------------------------------ Clientes ------------------------------ */

export function createReviewClientsHandler(options: ClientsHandlerOptions) {
  return async function reviewClientsHandler(request: Request): Promise<Response> {
    const unauthorized = requireAdmin(request, options.sessionSecret)
    if (unauthorized) return unauthorized

    const now = () => options.now?.() ?? new Date()

    try {
      switch (request.method) {
        case 'GET': {
          const clients = await options.store.listClients()
          return adminJson({ clients })
        }

        case 'POST': {
          const validation = validateClientInput(await readJson(request))
          if (!validation.ok) {
            return errorResponse(400, 'Revisa los datos del cliente.', validation.fields)
          }

          const timestamp = now().toISOString()
          const client: ReviewClient = {
            id: options.generateId?.() ?? randomUUID(),
            ...validation.value,
            createdAt: timestamp,
            updatedAt: timestamp
          }
          await options.store.saveClient(client)
          return adminJson({ client, message: 'Cliente registrado.' }, 201)
        }

        case 'PATCH': {
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return errorResponse(400, 'Falta el identificador del cliente.')

          const existing = await options.store.getClient(id)
          if (!existing) return errorResponse(404, 'El cliente no existe.')

          const body = await readJson(request)
          const merged = { ...existing, ...(isRecord(body) ? body : {}) }
          const validation = validateClientInput(merged)
          if (!validation.ok) {
            return errorResponse(400, 'Revisa los datos del cliente.', validation.fields)
          }

          const client: ReviewClient = {
            ...existing,
            ...validation.value,
            updatedAt: now().toISOString()
          }
          await options.store.saveClient(client)
          return adminJson({ client, message: 'Cliente actualizado.' })
        }

        case 'DELETE': {
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return errorResponse(400, 'Falta el identificador del cliente.')

          const existing = await options.store.getClient(id)
          if (!existing) return errorResponse(404, 'El cliente no existe.')

          await options.store.deleteByClient(id)
          await options.store.deleteClient(id)
          return adminJson({ ok: true, message: 'Cliente eliminado.' })
        }

        default:
          return methodNotAllowed('GET, POST, PATCH, DELETE')
      }
    } catch (error) {
      logError('review clients handler error', error)
      return errorResponse(500, 'No pudimos procesar los clientes.')
    }
  }
}

/* ---------------------------- Invitaciones ---------------------------- */

function toInvitationView(
  invitation: ReviewInvitation,
  client: ReviewClient,
  now: Date
): ReviewInvitationView {
  const last = invitation.history.at(-1)

  return {
    id: invitation.id,
    clientId: invitation.clientId,
    clientName: client.name,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    status: effectiveStatus(invitation, now),
    ...(last ? { lastSentAt: last.sentAt, lastChannel: last.channel } : {}),
    history: invitation.history
  }
}

export function createReviewInvitationsHandler(options: InvitationsHandlerOptions) {
  return async function reviewInvitationsHandler(request: Request): Promise<Response> {
    const unauthorized = requireAdmin(request, options.sessionSecret)
    if (unauthorized) return unauthorized

    const now = () => options.now?.() ?? new Date()

    try {
      if (request.method === 'GET') {
        const [invitations, clients] = await Promise.all([
          options.invitationStore.listInvitations(),
          options.clientStore.listClients()
        ])
        const byId = new Map(clients.map((client) => [client.id, client]))
        const timestamp = now()

        const views = sortNewest(invitations)
          .map((invitation) => {
            const client = byId.get(invitation.clientId)
            return client ? toInvitationView(invitation, client, timestamp) : null
          })
          .filter((view): view is ReviewInvitationView => view !== null)

        return adminJson({
          invitations: views,
          channels: {
            email: options.sender.emailConfigured,
            whatsapp: options.sender.whatsappConfigured
          }
        })
      }

      if (request.method === 'POST') {
        const body = await readJson(request)
        if (!isRecord(body)) return errorResponse(400, 'La solicitud no es válida.')

        const clientId = typeof body.clientId === 'string' ? body.clientId : ''
        const client = await options.clientStore.getClient(clientId)
        if (!client) return errorResponse(404, 'El cliente no existe.')

        const channels = validateChannels(body.channels, client)
        if (!channels.ok) return errorResponse(400, channels.error)

        let previous: ReviewInvitation | null = null
        if (typeof body.invitationId === 'string' && body.invitationId) {
          previous = await options.invitationStore.getInvitationById(body.invitationId)
          if (!previous || previous.clientId !== client.id) {
            return errorResponse(404, 'La invitación indicada no existe para ese cliente.')
          }
        }

        const timestamp = now()
        const token = createInvitationToken()
        const invitation: ReviewInvitation = {
          id: options.generateId?.() ?? randomUUID(),
          clientId: client.id,
          tokenHash: hashInvitationToken(token),
          createdAt: timestamp.toISOString(),
          expiresAt: invitationExpiry(timestamp),
          status: 'pendiente',
          history: []
        }

        const created = await options.invitationStore.saveInvitation(invitation, { onlyIfNew: true })
        if (!created) {
          return errorResponse(409, 'No se pudo crear la invitación. Inténtalo de nuevo.')
        }

        // El reenvío genera una liga nueva: la anterior deja de estar vigente.
        if (previous && effectiveStatus(previous, timestamp) !== 'expirada') {
          await options.invitationStore.saveInvitation({
            ...previous,
            status: 'expirada',
            deactivatedAt: timestamp.toISOString()
          })
        }

        const link = `${options.siteUrl}/resenas?token=${encodeURIComponent(token)}`
        const results = await Promise.all(
          channels.value.map(async (channel) => {
            const input = {
              to: channel === 'email' ? client.email : client.whatsapp,
              name: client.name,
              link
            }
            const result =
              channel === 'email'
                ? await options.sender.sendEmail(input)
                : await options.sender.sendWhatsApp(input)
            return { channel, ...result }
          })
        )

        const history: InvitationSendRecord[] = [
          ...invitation.history,
          ...results.map((result) => ({
            channel: result.channel,
            sentAt: now().toISOString(),
            ok: result.ok,
            ...(result.error ? { error: result.error } : {}),
            ...(result.providerMessageId ? { providerMessageId: result.providerMessageId } : {})
          }))
        ]
        const anyOk = results.some((result) => result.ok)
        const updated: ReviewInvitation = {
          ...invitation,
          status: anyOk ? 'enviada' : 'pendiente',
          history
        }
        await options.invitationStore.saveInvitation(updated)

        return adminJson({
          invitationId: updated.id,
          link,
          status: updated.status,
          results,
          message: anyOk
            ? 'Liga enviada.'
            : 'No se pudo enviar la liga. Revisa el error e inténtalo de nuevo.'
        })
      }

      return methodNotAllowed('GET, POST')
    } catch (error) {
      logError('review invitations handler error', error)
      return errorResponse(500, 'No pudimos procesar las invitaciones.')
    }
  }
}

/* -------------------------- Validación pública ------------------------ */

export function createPublicInvitationHandler(options: PublicInvitationHandlerOptions) {
  return async function publicInvitationHandler(request: Request): Promise<Response> {
    if (request.method !== 'GET') return methodNotAllowed('GET')

    const token = new URL(request.url).searchParams.get('token') ?? ''
    if (!isValidInvitationToken(token)) return publicJson({ valid: false })

    const invitation = await options.invitationStore.getInvitation(hashInvitationToken(token))
    const status = invitation
      ? effectiveStatus(invitation, options.now?.() ?? new Date())
      : null

    return publicJson({ valid: status === 'pendiente' || status === 'enviada' })
  }
}
```

## 4.2 CREAR las tres Functions

`netlify/functions/admin-review-clients.ts`

```ts
import { createReviewClientsHandler } from '../lib/review-invitations/handlers'
import { getReviewClientStore } from '../lib/review-invitations/runtime'

export const config = { path: '/api/admin/review-clients' }

export default async function adminReviewClients(request: Request) {
  return createReviewClientsHandler({
    store: getReviewClientStore(),
    sessionSecret: process.env.BLOG_SESSION_SECRET
  })(request)
}
```

`netlify/functions/admin-review-invitations.ts`

```ts
import { createReviewInvitationsHandler } from '../lib/review-invitations/handlers'
import {
  getInvitationSender,
  getReviewClientStore,
  getReviewInvitationStore,
  getSiteUrl
} from '../lib/review-invitations/runtime'

export const config = { path: '/api/admin/review-invitations' }

export default async function adminReviewInvitations(request: Request) {
  return createReviewInvitationsHandler({
    clientStore: getReviewClientStore(),
    invitationStore: getReviewInvitationStore(),
    sender: getInvitationSender(),
    siteUrl: getSiteUrl(),
    sessionSecret: process.env.BLOG_SESSION_SECRET
  })(request)
}
```

`netlify/functions/review-invitation.ts`

```ts
import { createPublicInvitationHandler } from '../lib/review-invitations/handlers'
import { getReviewInvitationStore } from '../lib/review-invitations/runtime'

export const config = { path: '/api/reviews/invitation' }

export default async function reviewInvitation(request: Request) {
  return createPublicInvitationHandler({ invitationStore: getReviewInvitationStore() })(request)
}
```

Verificación del paso 4:

```bash
npm run typecheck
npx vitest run netlify/lib/review-invitations/__tests__/clients-handler.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/invitations-handler.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/public-invitation.spec.ts
```

Checkboxes: `tasks.md` 4.1, 4.2, 4.3.

# PASO 5 — Restringir la creación de reseñas

## 5.1 EDITAR `netlify/lib/reviews/validation.ts`

Dos cambios pequeños:

**a)** Sustituye la interfaz `ValidReviewInput`:

```ts
export interface ValidReviewInput {
  name: string
  rating: number
  message: string
  consent: true
  honeypot: string
  invitationToken: string
}
```

**b)** Agrega la lectura del token junto a las demás variables (`después de const honeypot ...`):

```ts
  const invitationToken = typeof input.invitationToken === 'string' ? input.invitationToken.trim() : ''
```

**c)** Sustituye el `return` final de `validateReviewInput`:

```ts
  return { ok: true, value: { name, rating, message, consent: true, honeypot, invitationToken } }
```

> No agregues `invitationToken` a `fields`: la ausencia se responde con `401` en el handler, no como error de campo.

## 5.2 REEMPLAZAR `netlify/lib/reviews/handler.ts` por completo

```ts
import { createHash, timingSafeEqual } from 'node:crypto'
import type {
  ApiErrorBody,
  CreateReviewResult,
  PublicReview,
  Review,
  ReviewStatus,
  ReviewsResponse
} from '../../../src/types/reviews'
import { reviewLimits } from '../../../src/content/reviews'
import type { InvitationStore } from '../review-invitations/store'
import { effectiveStatus, hashInvitationToken } from '../review-invitations/token'
import type { ReviewStore } from './store'
import { detectSpam, hashIp, validateReviewInput } from './validation'

export const APPROVED_MESSAGE = 'Gracias por compartir tu experiencia. Tu reseña ya está publicada.'
export const PENDING_MESSAGE =
  'Gracias por compartir tu experiencia. Tu reseña se publicará después de una revisión.'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
}

/** La asociación al cliente se guarda solo en Blobs; nunca sale en la API pública. */
interface StoredReview extends Review {
  invitationId?: string
}

export interface ReviewsHandlerOptions {
  store: ReviewStore
  invitationStore: InvitationStore
  adminToken?: string
  rateSalt?: string
  now?: () => Date
  generateId?: () => string
  maxPerDay?: number
  maxPublic?: number
}

type ReviewsHandler = (
  request: Request,
  context?: { ip?: string }
) => Promise<Response>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function empty(status: number) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })
}

function errorResponse(status: number, error: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = fields ? { error, fields } : { error }
  return json(body, status)
}

function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    message: review.message,
    createdAt: review.createdAt
  }
}

function sortNewestFirst(reviews: Review[]) {
  return [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function summarize(reviews: Review[]) {
  const count = reviews.length
  const average =
    count === 0
      ? 0
      : Math.round((reviews.reduce((total, review) => total + review.rating, 0) / count) * 10) / 10

  return { average, count }
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

function authorize(request: Request, adminToken?: string) {
  if (!adminToken) {
    return errorResponse(503, 'La administración de reseñas no está configurada.')
  }

  const header = request.headers.get('authorization')
  if (!header) return errorResponse(401, 'No autorizado.')

  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return errorResponse(401, 'No autorizado.')
  if (!safeEqual(match[1].trim(), adminToken)) {
    return errorResponse(403, 'Token administrativo inválido.')
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function handleGet(request: Request, options: ReviewsHandlerOptions) {
  const url = new URL(request.url)

  if (url.searchParams.get('status') === 'pending') {
    const unauthorized = authorize(request, options.adminToken)
    if (unauthorized) return unauthorized

    const pending = sortNewestFirst(
      (await options.store.listReviews()).filter((review) => review.status === 'pending')
    )
    return json({ reviews: pending })
  }

  const approved = sortNewestFirst(
    (await options.store.listReviews()).filter((review) => review.status === 'approved')
  )
  const maxPublic = options.maxPublic ?? reviewLimits.maxPublic
  const response: ReviewsResponse = {
    reviews: approved.slice(0, maxPublic).map(toPublicReview),
    summary: summarize(approved)
  }

  return json(response)
}

async function handlePost(
  request: Request,
  options: ReviewsHandlerOptions,
  ip: string
) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'El cuerpo de la solicitud no es JSON válido.')
  }

  const validation = validateReviewInput(body)
  if (!validation.ok) {
    return errorResponse(400, 'Revisa los campos de la reseña.', validation.fields)
  }

  const input = validation.value
  const now = options.now?.() ?? new Date()
  const createdAt = now.toISOString()

  // 1) La invitación se valida antes de cualquier otro procesamiento.
  if (!input.invitationToken) {
    return errorResponse(401, 'Necesitas una invitación válida para publicar una reseña.')
  }

  const tokenHash = hashInvitationToken(input.invitationToken)
  const invitationRecord = await options.invitationStore.getInvitationWithEtag(tokenHash)
  const invitationStatus = invitationRecord
    ? effectiveStatus(invitationRecord.invitation, now)
    : null

  if (
    !invitationRecord ||
    (invitationStatus !== 'pendiente' && invitationStatus !== 'enviada')
  ) {
    return errorResponse(
      invitationStatus === 'canjeada' ? 403 : 401,
      'La invitación no es válida, expiró o ya fue utilizada.'
    )
  }

  const invitation = invitationRecord.invitation

  // 2) Botón trampa: no consumimos la invitación.
  if (input.honeypot) {
    const hiddenReview: PublicReview = {
      id: 'hidden',
      name: input.name,
      rating: input.rating,
      message: input.message,
      createdAt
    }
    const result: CreateReviewResult = {
      review: hiddenReview,
      status: 'pending',
      message: PENDING_MESSAGE
    }
    return json(result, 201)
  }

  // 3) Límite por IP.
  const rateSalt = options.rateSalt ?? 'origen-consciente'
  const ipHash = hashIp(ip, rateSalt)
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000
  const timestamps = (await options.store.getRateTimestamps(ipHash)).filter((timestamp) => {
    const time = Date.parse(timestamp)
    return Number.isFinite(time) && time > cutoff
  })

  if (timestamps.length >= (options.maxPerDay ?? reviewLimits.maxPerDay)) {
    return errorResponse(
      429,
      'Has alcanzado el límite de reseñas por hoy. Inténtalo de nuevo más tarde.'
    )
  }

  // 4) Spam y moderación (sin cambios).
  const spam = detectSpam(input)
  const status: ReviewStatus = spam.suspicious ? 'pending' : 'approved'
  const review: StoredReview = {
    id: options.generateId?.() ?? crypto.randomUUID(),
    name: input.name,
    rating: input.rating,
    message: input.message,
    status,
    createdAt,
    invitationId: invitation.id
  }

  // 5) Canjeo atómico justo antes de guardar.
  const redeemed = await options.invitationStore.saveInvitation(
    {
      ...invitation,
      status: 'canjeada',
      redeemedAt: createdAt,
      reviewId: review.id
    },
    { onlyIfMatch: invitationRecord.etag }
  )

  if (!redeemed) {
    return errorResponse(409, 'La invitación ya fue utilizada. Solicita una nueva liga.')
  }

  // 6) Si falla el guardado, devolvemos la invitación a su estado anterior.
  try {
    await options.store.saveReview(review)
    await options.store.saveRateTimestamps(ipHash, [...timestamps, createdAt])
  } catch (error) {
    await options.invitationStore.saveInvitation(invitation)
    console.error(
      'reviews save error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return errorResponse(500, 'No pudimos guardar tu reseña. Inténtalo de nuevo.')
  }

  const result: CreateReviewResult = {
    review: toPublicReview(review),
    status,
    message: status === 'approved' ? APPROVED_MESSAGE : PENDING_MESSAGE
  }

  return json(result, 201)
}

async function handlePatch(request: Request, options: ReviewsHandlerOptions) {
  const unauthorized = authorize(request, options.adminToken)
  if (unauthorized) return unauthorized

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'El cuerpo de la solicitud no es JSON válido.')
  }

  if (!isRecord(body) || typeof body.id !== 'string' || body.status !== 'approved') {
    return errorResponse(400, 'La solicitud de moderación no es válida.')
  }

  const review = await options.store.getReview(body.id)
  if (!review) return errorResponse(404, 'La reseña no existe.')

  const approved: Review = { ...review, status: 'approved' }
  await options.store.saveReview(approved)

  return json({ review: toPublicReview(approved) })
}

async function handleDelete(request: Request, options: ReviewsHandlerOptions) {
  const unauthorized = authorize(request, options.adminToken)
  if (unauthorized) return unauthorized

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return errorResponse(400, 'Falta el identificador de la reseña.')

  const review = await options.store.getReview(id)
  if (!review) return errorResponse(404, 'La reseña no existe.')

  await options.store.deleteReview(id)
  return empty(204)
}

export function createReviewsHandler(options: ReviewsHandlerOptions): ReviewsHandler {
  return async (request, context) => {
    try {
      switch (request.method) {
        case 'GET':
          return await handleGet(request, options)
        case 'POST':
          return await handlePost(request, options, context?.ip ?? 'unknown')
        case 'PATCH':
          return await handlePatch(request, options)
        case 'DELETE':
          return await handleDelete(request, options)
        default:
          return new Response(null, {
            status: 405,
            headers: {
              Allow: 'GET, POST, PATCH, DELETE',
              'Cache-Control': 'no-store'
            }
          })
      }
    } catch (error) {
      console.error(
        'reviews handler error:',
        error instanceof Error ? error.message : 'unknown error'
      )
      return errorResponse(500, 'No pudimos procesar las reseñas.')
    }
  }
}
```

## 5.3 REEMPLAZAR `netlify/functions/reviews.ts` por completo

```ts
import type { Context } from '@netlify/functions'
import { createReviewsHandler } from '../lib/reviews/handler'
import { createBlobReviewStore } from '../lib/reviews/store'
import { createBlobInvitationStore } from '../lib/review-invitations/store'

let handler: ReturnType<typeof createReviewsHandler> | undefined

function getHandler() {
  if (!handler) {
    handler = createReviewsHandler({
      store: createBlobReviewStore(),
      invitationStore: createBlobInvitationStore(),
      adminToken: process.env.REVIEWS_ADMIN_TOKEN,
      rateSalt: process.env.REVIEWS_RATE_SALT
    })
  }

  return handler
}

function getClientIp(request: Request, context: Context) {
  const forwarded =
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]

  return context.ip ?? forwarded?.trim() ?? 'unknown'
}

export default async function reviews(request: Request, context: Context) {
  return getHandler()(request, { ip: getClientIp(request, context) })
}
```

## 5.4 Actualizar tests existentes

En `src/services/__tests__/reviews.spec.ts`, agrega `invitationToken: 'token-de-prueba-valido'` al objeto `payload` (línea 8).

En `netlify/lib/reviews/__tests__/handler.spec.ts`, todas las llamadas a `createReviewsHandler` deben pasar el nuevo store:

```ts
import { createMemoryInvitationStore } from '../../review-invitations/store'
import { createInvitationToken, hashInvitationToken } from '../../review-invitations/token'

// en cada creación del handler:
invitationStore: createMemoryInvitationStore()

// en cada POST válido, agrega al body:
invitationToken: token
```

Donde `token` se crea con `createInvitationToken()` y se siembra:

```ts
const token = createInvitationToken()
const invitationStore = createMemoryInvitationStore([
  {
    id: 'inv-1',
    clientId: 'client-1',
    tokenHash: hashInvitationToken(token),
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    status: 'enviada',
    history: []
  }
])
```

Verificación del paso 5:

```bash
npx vitest run netlify/lib/reviews
npx vitest run src/services/__tests__/reviews.spec.ts
npm run typecheck
npx playwright test tests/e2e/reviews.spec.ts
```

Checkboxes: `tasks.md` 5.1, 5.2, 5.3.

---

# PASO 6 — Frontend público

## 6.1 REEMPLAZAR `src/services/reviews.ts` por completo

```ts
import type {
  ApiErrorBody,
  CreateReviewPayload,
  CreateReviewResult,
  ReviewsResponse
} from '../types/reviews'

export interface InvitationCheckResult {
  valid: boolean
}

export class ReviewsApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'ReviewsApiError'
    this.status = status
    this.fields = fields
  }
}

async function parseError(response: Response): Promise<never> {
  let body: ApiErrorBody | undefined

  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = undefined
  }

  throw new ReviewsApiError(
    body?.error ?? 'No pudimos procesar la solicitud de reseñas.',
    response.status,
    body?.fields
  )
}

export async function checkInvitation(token: string): Promise<InvitationCheckResult> {
  let response: Response

  try {
    response = await fetch(`/api/reviews/invitation?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' }
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos validar la invitación. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as InvitationCheckResult
}

export async function listReviews(): Promise<ReviewsResponse> {
  let response: Response

  try {
    response = await fetch('/api/reviews', {
      headers: { Accept: 'application/json' }
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos conectar con el servicio de reseñas. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as ReviewsResponse
}

export async function createReview(payload: CreateReviewPayload): Promise<CreateReviewResult> {
  let response: Response

  try {
    response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new ReviewsApiError(
      'No pudimos enviar tu reseña. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  if (!response.ok) await parseError(response)
  return (await response.json()) as CreateReviewResult
}
```

## 6.2 REEMPLAZAR `src/views/ReviewsView.vue` por completo

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ReviewForm from '../components/sections/ReviewForm.vue'
import ReviewList from '../components/sections/ReviewList.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'
import StarRating from '../components/ui/StarRating.vue'
import { pageMeta } from '../content/pages'
import { formatReviewAverage } from '../content/reviews'
import { usePageMeta } from '../composables/usePageMeta'
import { checkInvitation, listReviews, ReviewsApiError } from '../services/reviews'
import type { PublicReview, ReviewSummary } from '../types/reviews'

usePageMeta(pageMeta.reviews)

type InvitationState = 'checking' | 'valid' | 'invalid' | 'error'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const invitation = ref<InvitationState>(token ? 'checking' : 'invalid')

const reviews = ref<PublicReview[]>([])
const summary = ref<ReviewSummary>({ average: 0, count: 0 })
const status = ref<'loading' | 'idle' | 'error'>('loading')
const error = ref('')

const averageLabel = computed(() => formatReviewAverage(summary.value.average))
const hasReviews = computed(() => summary.value.count > 0)

async function loadReviews() {
  status.value = 'loading'
  error.value = ''

  try {
    const data = await listReviews()
    reviews.value = data.reviews
    summary.value = data.summary
    status.value = 'idle'
  } catch (caught) {
    status.value = 'error'
    error.value =
      caught instanceof ReviewsApiError
        ? caught.message
        : 'No pudimos cargar las reseñas. Inténtalo de nuevo.'
  }
}

async function checkToken() {
  if (!token) {
    invitation.value = 'invalid'
    return
  }

  invitation.value = 'checking'

  try {
    const result = await checkInvitation(token)
    invitation.value = result.valid ? 'valid' : 'invalid'
  } catch {
    invitation.value = 'error'
  }
}

onMounted(() => {
  void loadReviews()
  void checkToken()
})
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Reseñas"
      title="Lo que dicen nuestros clientes"
      subtitle="Conoce cómo la hipnosis ha acompañado a otras personas en su proceso. Las reseñas se escriben solo con una invitación privada."
    />

    <div class="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <BaseCard class="p-6 md:p-8">
        <template v-if="invitation === 'valid'">
          <h2 class="font-display text-2xl font-semibold text-accent">Comparte tu experiencia</h2>
          <p class="mt-2 font-body text-sm text-text-muted">
            Tu opinión ayuda a otras personas a dar el primer paso. Las reseñas se publican después de
            una revisión automática.
          </p>
          <div class="mt-6">
            <ReviewForm :token="token" @created="loadReviews" />
          </div>
        </template>

        <template v-else-if="invitation === 'invalid'">
          <h2 class="font-display text-2xl font-semibold text-accent">Reseñas por invitación</h2>
          <p class="mt-2 font-body text-sm leading-relaxed text-text-muted">
            Publicamos las experiencias de las personas que han trabajado con nosotras. Si recibiste
            una liga privada, ábrela desde el correo o el mensaje que te enviamos para compartir tu
            experiencia.
          </p>
          <p v-if="token" class="mt-4 font-body text-sm text-text-muted" role="status">
            Esta liga ya no es válida. Si la necesitas, pide una nueva invitación.
          </p>
        </template>

        <template v-else>
          <h2 class="font-display text-2xl font-semibold text-accent">Un momento…</h2>
          <p class="mt-2 font-body text-sm text-text-muted" role="status" aria-live="polite">
            {{
              invitation === 'error'
                ? 'No pudimos validar la invitación. Recarga la página para intentarlo de nuevo.'
                : 'Estamos validando tu invitación.'
            }}
          </p>
        </template>
      </BaseCard>

      <div class="space-y-6">
        <BaseCard v-if="hasReviews" class="p-6">
          <div class="flex flex-wrap items-center gap-4">
            <p class="font-display text-4xl font-semibold text-accent">
              {{ averageLabel }}
            </p>
            <div>
              <StarRating :rating="summary.average" />
              <p class="mt-1 font-body text-sm text-text-muted">
                {{ summary.count }}
                {{ summary.count === 1 ? 'reseña publicada' : 'reseñas publicadas' }}
              </p>
            </div>
          </div>
        </BaseCard>

        <ReviewList
          :reviews="reviews"
          :status="status"
          :error="error"
          @retry="loadReviews"
        />
      </div>
    </div>
  </section>
</template>
```

## 6.3 EDITAR `src/components/sections/ReviewForm.vue`

**a)** Después de `const emit = defineEmits<{ created: [result: CreateReviewResult] }>()` agrega:

```ts
const props = defineProps<{ token: string }>()
```

**b)** Al inicio de `onSubmit`, justo después de la firma, agrega el guardia:

```ts
  if (!props.token) {
    status.value = 'error'
    feedback.value = 'Esta liga ya no es válida. Solicita una nueva invitación.'
    return
  }
```

**c)** En la llamada a `createReview`, agrega el campo `invitationToken`:

```ts
    const result = await createReview({
      name: name.value.trim(),
      rating: rating.value as number,
      message: message.value.trim(),
      consent: consent.value,
      honeypot: honeypot.value,
      invitationToken: props.token
    })
```

> El token **no** se pinta en la plantilla: solo viaja en el payload.

Verificación del paso 6:

```bash
npm run typecheck
npx vitest run src/services/__tests__/reviews.spec.ts
npx vitest run src/views/__tests__/reviews-view.spec.ts
npx vitest run src/components/sections/__tests__/review-form.spec.ts
npx playwright test tests/e2e/reviews.spec.ts tests/e2e/a11y.spec.ts
```

Checkboxes: `tasks.md` 6.1, 6.2, 6.3, 6.4.

# PASO 7 — Panel `/admin/resenas`

## 7.1 CREAR `src/services/adminReviewInvitations.ts`

```ts
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
```

> La verificación de sesión se reutiliza de `src/services/adminBlog.ts` (`getSession`, `logout`) y el login de `AdminLogin.vue`, que ya apuntan a `/api/admin/session` y `/api/admin/login`.

## 7.2 CREAR `src/components/admin/AdminReviewClientList.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { InvitationStatus, ReviewClient, ReviewInvitationView } from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'

const props = defineProps<{
  clients: ReviewClient[]
  invitations: ReviewInvitationView[]
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  create: []
  edit: [client: ReviewClient]
  delete: [client: ReviewClient]
  select: [client: ReviewClient]
}>()

const statusByClient = computed(() => {
  const map = new Map<string, ReviewInvitationView>()
  for (const invitation of props.invitations) {
    if (!map.has(invitation.clientId)) map.set(invitation.clientId, invitation)
  }
  return map
})

function label(status: InvitationStatus | undefined): string {
  if (!status) return 'Sin invitación'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">Reseñas por invitación</h1>
      </div>
      <BaseButton size="sm" @click="emit('create')">Nuevo cliente</BaseButton>
    </div>

    <p v-if="loading" class="font-body text-sm text-text-muted" role="status" aria-live="polite">
      Cargando clientes…
    </p>
    <p v-else-if="error" class="font-body text-sm text-red-500" role="alert">{{ error }}</p>
    <p v-else-if="clients.length === 0" class="font-body text-sm text-text-muted">
      Aún no hay clientes registrados.
    </p>

    <div v-else class="overflow-x-auto rounded-xl border border-border">
      <table class="w-full min-w-[720px] text-left font-body text-sm">
        <thead class="bg-surface text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th class="px-4 py-3">Cliente</th>
            <th class="px-4 py-3">Correo</th>
            <th class="px-4 py-3">WhatsApp</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Último envío</th>
            <th class="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in clients" :key="client.id" class="border-t border-border">
            <td class="px-4 py-3 text-text">{{ client.name }}</td>
            <td class="px-4 py-3 text-text-muted">{{ client.email || '—' }}</td>
            <td class="px-4 py-3 text-text-muted">{{ client.whatsapp || '—' }}</td>
            <td class="px-4 py-3 text-text-muted">
              {{ label(statusByClient.get(client.id)?.status) }}
            </td>
            <td class="px-4 py-3 text-text-muted">
              {{ statusByClient.get(client.id)?.lastSentAt ?? '—' }}
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <BaseButton size="sm" variant="secondary" @click="emit('select', client)">
                  Elegir
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="emit('edit', client)">
                  Editar
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="emit('delete', client)">
                  Eliminar
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
```

## 7.3 CREAR `src/components/admin/AdminReviewClientForm.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ReviewClient, ReviewClientInput } from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'

const props = defineProps<{ client: ReviewClient | null }>()

const emit = defineEmits<{
  save: [input: ReviewClientInput]
  cancel: []
}>()

const name = ref(props.client?.name ?? '')
const email = ref(props.client?.email ?? '')
const whatsapp = ref(props.client?.whatsapp ?? '')

function submit() {
  emit('save', {
    name: name.value.trim(),
    email: email.value.trim(),
    whatsapp: whatsapp.value.trim()
  })
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-border bg-surface p-6" @submit.prevent="submit">
    <h2 class="font-display text-xl font-semibold text-accent">
      {{ client ? 'Editar cliente' : 'Nuevo cliente' }}
    </h2>
    <p class="font-body text-sm text-text-muted">
      Registra al menos un medio de contacto. Los datos no se muestran en el sitio público.
    </p>

    <BaseInput v-model="name" label="Nombre" autocomplete="name" required />
    <BaseInput v-model="email" label="Correo electrónico" type="email" autocomplete="email" optional />
    <BaseInput
      v-model="whatsapp"
      label="WhatsApp (con código de país)"
      type="tel"
      autocomplete="tel"
      optional
    />

    <div class="flex flex-wrap gap-2">
      <BaseButton type="submit">Guardar cliente</BaseButton>
      <BaseButton type="button" variant="secondary" @click="emit('cancel')">Cancelar</BaseButton>
    </div>
  </form>
</template>
```

## 7.4 CREAR `src/components/admin/AdminReviewInvitationActions.vue`

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  InvitationChannel,
  ReviewClient,
  ReviewInvitationView
} from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'

const props = defineProps<{
  client: ReviewClient
  invitation?: ReviewInvitationView | null
  emailConfigured: boolean
  whatsappConfigured: boolean
  sending?: boolean
}>()

const emit = defineEmits<{ send: [channels: InvitationChannel[]] }>()

const channels = ref<InvitationChannel[]>([])

const emailAvailable = computed(() => Boolean(props.client.email) && props.emailConfigured)
const whatsappAvailable = computed(() => Boolean(props.client.whatsapp) && props.whatsappConfigured)

const canSend = computed(() => channels.value.length > 0 && !props.sending)

const needsResend = computed(() => {
  if (!props.invitation) return false
  return props.invitation.status === 'expirada' || props.invitation.status === 'canjeada'
})

watch(
  () => props.client.id,
  () => {
    channels.value = [
      ...(emailAvailable.value ? (['email'] as InvitationChannel[]) : []),
      ...(whatsappAvailable.value ? (['whatsapp'] as InvitationChannel[]) : [])
    ]
  },
  { immediate: true }
)

function toggle(channel: InvitationChannel) {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter((item) => item !== channel)
    : [...channels.value, channel]
}

function submit() {
  if (!canSend.value) return
  emit('send', [...channels.value])
}
</script>

<template>
  <section class="space-y-4 rounded-xl border border-border bg-surface p-6">
    <div>
      <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        Enviar liga
      </p>
      <h2 class="mt-1 font-display text-xl font-semibold text-accent">{{ client.name }}</h2>
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-3 font-body text-sm text-text">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          :checked="channels.includes('email')"
          :disabled="!emailAvailable"
          @change="toggle('email')"
        />
        Correo
        <span v-if="!emailAvailable" class="text-text-muted">
          ({{ client.email ? 'Resend no configurado' : 'sin correo registrado' }})
        </span>
      </label>
      <label class="flex items-center gap-3 font-body text-sm text-text">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          :checked="channels.includes('whatsapp')"
          :disabled="!whatsappAvailable"
          @change="toggle('whatsapp')"
        />
        WhatsApp
        <span v-if="!whatsappAvailable" class="text-text-muted">
          ({{ client.whatsapp ? 'proveedor no configurado' : 'sin número registrado' }})
        </span>
      </label>
    </div>

    <BaseButton :loading="sending" :disabled="!canSend" @click="submit">
      {{ needsResend ? 'REENVIAR (NUEVA LIGA)' : 'ENVIAR LIGA' }}
    </BaseButton>
  </section>
</template>
```

## 7.5 CREAR `src/views/admin/AdminReviewsView.vue`

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import AdminReviewClientForm from '../../components/admin/AdminReviewClientForm.vue'
import AdminReviewClientList from '../../components/admin/AdminReviewClientList.vue'
import AdminReviewInvitationActions from '../../components/admin/AdminReviewInvitationActions.vue'
import { usePageMeta } from '../../composables/usePageMeta'
import { getSession, logout } from '../../services/adminBlog'
import {
  AdminReviewApiError,
  createClient,
  deleteClient,
  listClients,
  listInvitations,
  sendInvitation,
  updateClient
} from '../../services/adminReviewInvitations'
import type {
  InvitationChannel,
  ReviewClient,
  ReviewClientInput,
  ReviewInvitationView,
  SendInvitationResult
} from '../../types/review-invitations'

usePageMeta({
  title: 'Administración de reseñas | Origen Consciente',
  description: 'Área privada para invitar a clientes a dejar reseñas.',
  path: '/admin/resenas',
  robots: 'noindex, nofollow'
})

const checking = ref(true)
const authenticated = ref(false)
const clients = ref<ReviewClient[]>([])
const invitations = ref<ReviewInvitationView[]>([])
const channels = ref({ email: false, whatsapp: false })
const loading = ref(false)
const listError = ref('')
const editing = ref<ReviewClient | null | undefined>(undefined)
const selected = ref<ReviewClient | null>(null)
const sending = ref('')
const notice = ref('')
const actionError = ref('')
const lastResult = ref<SendInvitationResult | null>(null)

function resetSession() {
  authenticated.value = false
  clients.value = []
  invitations.value = []
  editing.value = undefined
  selected.value = null
  notice.value = ''
}

function handleApiError(caught: unknown, fallback: string) {
  if (caught instanceof AdminReviewApiError) {
    if (caught.status === 401) {
      resetSession()
      actionError.value = 'Tu sesión expiró. Ingresa de nuevo.'
      return
    }
    actionError.value = caught.message
    return
  }
  actionError.value = fallback
}

async function loadData() {
  loading.value = true
  listError.value = ''

  try {
    const [clientData, invitationData] = await Promise.all([listClients(), listInvitations()])
    clients.value = clientData.clients
    invitations.value = invitationData.invitations
    channels.value = invitationData.channels
    if (selected.value) {
      selected.value = clients.value.find((item) => item.id === selected.value?.id) ?? null
    }
  } catch (caught) {
    handleApiError(caught, 'No pudimos cargar los clientes.')
    listError.value = actionError.value
  } finally {
    loading.value = false
  }
}

async function checkSession() {
  checking.value = true

  try {
    await getSession()
    authenticated.value = true
    await loadData()
  } catch (caught) {
    if (caught instanceof AdminReviewApiError && caught.status === 401) {
      authenticated.value = false
    } else {
      handleApiError(caught, 'No pudimos verificar la sesión.')
    }
  } finally {
    checking.value = false
  }
}

function handleAuthenticated() {
  authenticated.value = true
  actionError.value = ''
  void loadData()
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    resetSession()
  }
}

function handleEdit(client: ReviewClient) {
  actionError.value = ''
  notice.value = ''
  editing.value = client
}

async function handleSaved(input: ReviewClientInput) {
  actionError.value = ''

  try {
    const editingClient = editing.value
    const result = editingClient
      ? await updateClient(editingClient.id, input)
      : await createClient(input)
    editing.value = undefined
    selected.value = result.client
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos guardar el cliente.')
  }
}

async function handleDelete(client: ReviewClient) {
  if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar a ${client.name}?`)) return

  actionError.value = ''

  try {
    const result = await deleteClient(client.id)
    if (selected.value?.id === client.id) selected.value = null
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos eliminar el cliente.')
  }
}

async function handleSend(selectedChannels: InvitationChannel[]) {
  if (!selected.value) return

  sending.value = selected.value.id
  actionError.value = ''
  lastResult.value = null

  try {
    const invitationId = invitations.value.find((item) => item.clientId === selected.value?.id)?.id
    const result = await sendInvitation({
      clientId: selected.value.id,
      channels: selectedChannels,
      ...(invitationId ? { invitationId } : {})
    })
    lastResult.value = result
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos enviar la liga.')
  } finally {
    sending.value = ''
  }
}

function statusFor(clientId: string) {
  return invitations.value.find((item) => item.clientId === clientId) ?? null
}

onMounted(checkSession)
</script>

<template>
  <div>
    <div v-if="notice" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-accent/40 bg-accent-satin/10 p-4" role="status" aria-live="polite">
        <p class="font-body text-sm text-text">{{ notice }}</p>
      </div>
    </div>

    <div v-if="actionError" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert">
        <p class="font-body text-sm text-red-500">{{ actionError }}</p>
      </div>
    </div>

    <div
      v-if="checking"
      class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center gap-3 px-4 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      Verificando sesión…
    </div>

    <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

    <div v-else class="mx-auto max-w-6xl space-y-6 px-4 py-12 md:px-8">
      <AdminReviewClientForm
        v-if="editing !== undefined"
        :client="editing"
        @saved="handleSaved"
        @cancel="editing = undefined"
      />

      <AdminReviewClientList
        :clients="clients"
        :invitations="invitations"
        :loading="loading"
        :error="listError"
        @create="editing = null"
        @edit="handleEdit"
        @delete="handleDelete"
        @select="selected = $event"
      />

      <AdminReviewInvitationActions
        v-if="selected"
        :client="selected"
        :invitation="statusFor(selected.id)"
        :email-configured="channels.email"
        :whatsapp-configured="channels.whatsapp"
        :sending="sending === selected.id"
        @send="handleSend"
      />

      <div v-if="lastResult" class="rounded-xl border border-border bg-surface p-6">
        <h2 class="font-display text-lg font-semibold text-accent">Resultado del envío</h2>
        <ul class="mt-3 space-y-1 font-body text-sm text-text-muted">
          <li v-for="result in lastResult.results" :key="result.channel">
            {{ result.channel }}: {{ result.ok ? 'enviado' : (result.error ?? 'error') }}
          </li>
        </ul>
        <p class="mt-3 break-all font-body text-sm text-text">
          <a :href="lastResult.link" class="underline">{{ lastResult.link }}</a>
        </p>
      </div>

      <div class="flex justify-end">
        <BaseButton variant="ghost" size="sm" @click="handleLogout">Cerrar sesión</BaseButton>
      </div>
    </div>
  </div>
</template>
```

## 7.6 EDITAR `src/router/index.ts`

Inserta esta ruta antes del catch-all:

```ts
  {
    path: '/admin/resenas',
    name: 'admin-reviews',
    component: () => import('@/views/admin/AdminReviewsView.vue')
  },
```

Queda entre `/admin/blog` y `/:pathMatch(.*)*`.

## 7.7 EDITAR `README.md`

**a)** Después de la fila de `REVIEWS_RATE_SALT` en la tabla de variables, agrega:

```md
| `RESEND_API_KEY` | Sí (envío) | Clave de la API de Resend para enviar las ligas por correo. |
| `REVIEWS_FROM_EMAIL` | Sí (envío) | Remitente verificado de Resend, p. ej. `Origen Consciente <hola@origenconsciente.mx>`. |
| `WHATSAPP_ACCESS_TOKEN` | Sí (envío) | Token de WhatsApp Cloud API. |
| `WHATSAPP_PHONE_NUMBER_ID` | Sí (envío) | ID del número de WhatsApp usado para enviar. |
```

**b)** Sustituye todo el bloque `## Reseñas de clientas` (desde la línea 104 hasta la 129) por:

```md
## Reseñas de clientas

Las reseñas ya no se aceptan desde un formulario público. Solo se pueden publicar desde una liga privada que el admin envía a un cliente registrado. La página `/resenas` sigue mostrando el promedio y las reseñas aprobadas; el formulario aparece únicamente cuando la liga es vigente.

### Panel `/admin/resenas`

Requiere la misma sesión que `/admin/blog` (`BLOG_SESSION_SECRET`). El flujo es:

1. **Nuevo cliente**: nombre y al menos un medio de contacto válido (correo y/o WhatsApp con código de país).
2. **Elegir cliente** y marcar los canales deseados.
3. **ENVIAR LIGA**: se genera un token opaco de 32 bytes, se guarda solo su hash SHA-256 y se envía `/resenas?token=<token>` por Resend y/o WhatsApp Cloud API.
4. El resultado se registra por canal. Si un proveedor falla, el registro queda `pendiente` y se puede reintentar.
5. Cuando la liga se canjea o expira (30 días), **REENVIAR (NUEVA LIGA)** crea un token nuevo y deja el anterior inactivo.

La plantilla de WhatsApp debe aprobarse en Meta antes de habilitar ese canal: nombre `review_invitation`, idioma `es_MX`, con dos variables de cuerpo (`{{1}}` = nombre, `{{2}}` = liga). El envío siempre lo inicia el admin; nunca es automático.

### APIs

- `GET /api/reviews`: hasta 50 reseñas aprobadas con `summary.average` y `summary.count`.
- `POST /api/reviews`: valida los campos de siempre **y exige `invitationToken`**. Token ausente → `401`; ya canjeado → `403`; carrera de canjeo → `409`.
- `GET /api/reviews?status=pending`, `PATCH /api/reviews`, `DELETE /api/reviews?id=...`: moderación con `Authorization: Bearer $REVIEWS_ADMIN_TOKEN`.
- `GET/POST/PATCH/DELETE /api/admin/review-clients`: CRUD de clientes (sesión administrativa).
- `GET/POST /api/admin/review-invitations`: listado y envío/reenvío (sesión administrativa).
- `GET /api/reviews/invitation?token=...`: devuelve solo `{ "valid": boolean }`, sin datos del cliente.

Moderación con `curl`:

```bash
curl -s "https://TU-SITIO.netlify.app/api/reviews?status=pending" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN"

curl -s -X PATCH "https://TU-SITIO.netlify.app/api/reviews" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"ID_DE_LA_RESENA","status":"approved"}'

curl -s -X DELETE "https://TU-SITIO.netlify.app/api/reviews?id=ID_DE_LA_RESENA" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN"
```

En local, `npm run dev` no ejecuta Functions; usa `npm run dev:netlify` y define todas las variables anteriores en `.env.local`.
```

Verificación del paso 7:

```bash
npm run typecheck
npm run build
npx vitest run src/services/__tests__/admin-review-invitations.spec.ts
npx vitest run src/views/admin/__tests__/admin-reviews-view.spec.ts
npx playwright test tests/e2e/admin-reviews.spec.ts
npx vite build && test ! -f dist/admin/resenas.html
```

Checkboxes: `tasks.md` 7.1 a 7.5 y 8.1, 8.2.

---

# PASO 8 — Cierre del change

El contenido de los archivos de test está en **`MANUAL-TESTS-REVIEW-INVITATIONS.md`**. Cópialos antes de ejecutar la verificación final.

```bash
npx vitest run
npm run typecheck
npm run lint
npm run build
npx playwright test

openspec validate add-review-invitations --strict
openspec archive add-review-invitations -y
openspec list --specs
```

Recuerda el orden de specs: antes de archivar debe existir la spec base `client-reviews` (Paso 0 de `MANUAL-IMPLEMENTATION.md`).

## Checklist de archivos

Archivos nuevos:

```text
src/types/review-invitations.ts
netlify/lib/review-invitations/token.ts
netlify/lib/review-invitations/store.ts
netlify/lib/review-invitations/validation.ts
netlify/lib/review-invitations/messaging.ts
netlify/lib/review-invitations/runtime.ts
netlify/lib/review-invitations/handlers.ts
netlify/functions/admin-review-clients.ts
netlify/functions/admin-review-invitations.ts
netlify/functions/review-invitation.ts
src/services/adminReviewInvitations.ts
src/views/admin/AdminReviewsView.vue
src/components/admin/AdminReviewClientList.vue
src/components/admin/AdminReviewClientForm.vue
src/components/admin/AdminReviewInvitationActions.vue
```

Archivos editados:

```text
src/types/reviews.ts
.env.example
public/_headers
netlify/lib/reviews/validation.ts
netlify/lib/reviews/handler.ts
netlify/functions/reviews.ts
src/services/reviews.ts
src/views/ReviewsView.vue
src/components/sections/ReviewForm.vue
src/router/index.ts
README.md
```


