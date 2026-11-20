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
