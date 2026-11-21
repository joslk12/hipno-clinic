import { randomUUID } from 'node:crypto'
import type {
  InvitationChannel,
  InvitationSendRecord,
  ReviewClient,
  ReviewInvitation,
  ReviewInvitationView
} from '../../../src/types/review-invitations'
import { hasValidSession, isAllowedOrigin } from '../blog/auth'
import { adminJson, errorResponse, methodNotAllowed, publicJson, readJson } from '../blog/http'
import {
  buildInvitationMessage,
  buildWhatsAppLink,
  type InvitationSender
} from './messaging'
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

        const generateWhatsapp = body.generateWhatsapp === true
        if (generateWhatsapp && !client.whatsapp) {
          return errorResponse(400, 'El cliente no tiene WhatsApp registrado.')
        }

        const channels = generateWhatsapp
          ? ({ ok: true as const, value: [] as InvitationChannel[] })
          : validateChannels(body.channels, client)
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
        const whatsappNumber = client.whatsapp
        const whatsappText = whatsappNumber
          ? buildInvitationMessage(client.name, link)
          : undefined
        const whatsapp = whatsappText
          ? { text: whatsappText, url: buildWhatsAppLink(whatsappNumber, whatsappText) }
          : undefined

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
          ...(whatsapp ? { whatsapp } : {}),
          message: generateWhatsapp
            ? 'Liga generada. Copia el mensaje y envíalo desde tu WhatsApp.'
            : anyOk
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
