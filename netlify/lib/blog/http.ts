import type { ApiErrorBody } from '../../../src/types/blog'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  })
}

export function adminJson(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return jsonResponse(body, status, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...headers
  })
}

export function publicJson(body: unknown, status = 200): Response {
  return jsonResponse(body, status, {
    'Cache-Control': 'no-store'
  })
}

export function errorResponse(
  status: number,
  error: string,
  fields?: Record<string, string>,
  headers: Record<string, string> = {}
): Response {
  const body: ApiErrorBody = fields ? { error, fields } : { error }
  return adminJson(body, status, headers)
}

export function publicErrorResponse(status: number, error: string): Response {
  return publicJson({ error }, status)
}

export function methodNotAllowed(allow: string): Response {
  return errorResponse(405, 'Método no permitido.', undefined, { Allow: allow })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}
