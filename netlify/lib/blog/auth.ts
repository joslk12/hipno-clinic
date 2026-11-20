import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'oc_admin_session'
export const SESSION_DURATION_SECONDS = 8 * 60 * 60
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_MAX_ATTEMPTS = 5

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function safeEqual(left: string, right: string): boolean {
  const leftDigest = digest(left)
  const rightDigest = digest(right)
  return timingSafeEqual(leftDigest, rightDigest)
}

export function verifyPassword(candidate: string, expected: string | undefined): boolean {
  if (!expected) return false
  return safeEqual(candidate, expected)
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

export function getRequestIp(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    headers.get('x-nf-client-connection-ip') ||
    forwarded ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return origin === new URL(request.url).origin
  } catch {
    return false
  }
}

interface SessionPayload {
  exp: number
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const payload: SessionPayload = {
    exp: Math.floor(now / 1000) + SESSION_DURATION_SECONDS
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): boolean {
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra !== undefined) return false

  const expected = Buffer.from(sign(encoded, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload
    return Number.isInteger(payload.exp) && payload.exp > Math.floor(now / 1000)
  } catch {
    return false
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}

  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=')
        if (index === -1) return [part, '']
        const name = part.slice(0, index).trim()
        const value = part.slice(index + 1).trim()
        try {
          return [name, decodeURIComponent(value)]
        } catch {
          return [name, value]
        }
      })
  )
}

function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return true
  }
}

export function sessionCookie(request: Request, token: string): string {
  const secure = isSecureRequest(request) ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
}

export function expiredSessionCookie(request: Request): string {
  const secure = isSecureRequest(request) ? '; Secure' : ''
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`
}

export function getSessionToken(request: Request): string | null {
  return parseCookies(request.headers.get('cookie'))[SESSION_COOKIE] ?? null
}

export function hasValidSession(request: Request, secret: string | undefined): boolean {
  if (!secret) return false
  const token = getSessionToken(request)
  return token !== null && verifySessionToken(token, secret)
}
