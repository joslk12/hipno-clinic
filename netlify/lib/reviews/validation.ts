import { createHash } from 'node:crypto'
import { reviewLimits } from '../../../src/content/reviews'

export interface ValidReviewInput {
  name: string
  rating: number
  message: string
  consent: true
  honeypot: string
  invitationToken: string
}

export type ReviewValidationResult =
  | { ok: true; value: ValidReviewInput }
  | { ok: false; fields: Record<string, string> }

const URL_PATTERN =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|mx|info|biz|ru|xyz|top|site|online)\b)/i

const BLOCKED_TERMS = [
  'viagra',
  'cialis',
  'casino',
  'apuesta',
  'bitcoin',
  'criptomoneda',
  'backlink',
  'prestamo',
  'gana dinero',
  'dinero rapido',
  'inversion garantizada',
  'trabajo desde casa',
  'seo barato'
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function validateReviewInput(input: unknown): ReviewValidationResult {
  if (!isRecord(input)) {
    return { ok: false, fields: { form: 'La solicitud no es válida.' } }
  }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  const rating = typeof input.rating === 'number' ? input.rating : Number.NaN
  const consent = input.consent === true
  const honeypot = typeof input.honeypot === 'string' ? input.honeypot.trim() : ''
  const invitationToken = typeof input.invitationToken === 'string' ? input.invitationToken.trim() : ''
  const fields: Record<string, string> = {}

  if (name.length < reviewLimits.nameMin || name.length > reviewLimits.nameMax) {
    fields.name = `Escribe tu nombre (${reviewLimits.nameMin} a ${reviewLimits.nameMax} caracteres).`
  }

  if (
    !Number.isInteger(rating) ||
    rating < reviewLimits.ratingMin ||
    rating > reviewLimits.ratingMax
  ) {
    fields.rating = 'Elige una calificación de 1 a 5 estrellas.'
  }

  if (message.length < reviewLimits.messageMin || message.length > reviewLimits.messageMax) {
    fields.message = `Cuéntanos tu experiencia (${reviewLimits.messageMin} a ${reviewLimits.messageMax} caracteres).`
  }

  if (!consent) {
    fields.consent = 'Necesitamos tu consentimiento para publicar la reseña.'
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields }
  }

  return { ok: true, value: { name, rating, message, consent: true, honeypot, invitationToken } }
}

export function hashIp(ip: string, salt: string) {
  return createHash('sha256').update(`${salt}:${ip || 'unknown'}`).digest('hex')
}

export function detectSpam(input: ValidReviewInput) {
  const reasons: string[] = []
  const normalizedMessage = normalize(input.message)

  if (URL_PATTERN.test(input.message)) reasons.push('url')
  if (BLOCKED_TERMS.some((term) => normalizedMessage.includes(term))) reasons.push('blocked-term')
  if (/(.)\1{7,}/u.test(input.message)) reasons.push('repeated-characters')

  const letters = input.message.replace(/[^a-záéíóúñ]/gi, '')
  const uppercase = input.message.replace(/[^A-ZÁÉÍÓÚÑ]/g, '')

  if (letters.length >= 30 && uppercase.length / letters.length > 0.7) {
    reasons.push('uppercase')
  }

  return { suspicious: reasons.length > 0, reasons }
}
