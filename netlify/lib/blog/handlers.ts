import { randomUUID } from 'node:crypto'
import type {
  AdminPostsResponse,
  BlogDeleteResult,
  BlogPostInput,
  BlogPostMutationResult,
  BlogPostRecord,
  BlogStatus,
  BuildResult,
  ImageCleanupResult,
  PublicBlogPost
} from '../../../src/types/blog'
import {
  createSessionToken,
  expiredSessionCookie,
  getRequestIp,
  hasValidSession,
  hashIp,
  isAllowedOrigin,
  sessionCookie,
  verifyPassword
} from './auth'
import { shouldTriggerBuild, triggerBuild } from './build'
import type { BlogEnv } from './config'
import {
  adminJson,
  errorResponse,
  methodNotAllowed,
  publicErrorResponse,
  publicJson,
  readJson
} from './http'
import {
  imageUrl,
  isValidImageKey,
  postImageKeys,
  validateImageFile,
  type UploadedImageFile
} from './images'
import { renderMarkdown } from './markdown'
import { clearLoginFailures, loginRateLimit, recordLoginFailure } from './rate-limit'
import { ensureUniqueSlug, slugify } from './slug'
import type { BlogStore } from './store'
import { validatePostInput } from './validation'

export interface HandlerDeps {
  store: BlogStore
  env: BlogEnv
  now?: () => Date
  randomId?: () => string
  fetchImpl?: typeof fetch
}

function now(deps: HandlerDeps): Date {
  return (deps.now ?? (() => new Date()))()
}

function randomId(deps: HandlerDeps): string {
  return (deps.randomId ?? randomUUID)()
}

function fetchImpl(deps: HandlerDeps): typeof fetch {
  return deps.fetchImpl ?? fetch
}

function requireAdmin(request: Request, env: BlogEnv): Response | null {
  if (!env.sessionSecret) {
    return errorResponse(503, 'La administración del blog no está configurada.')
  }
  if (!hasValidSession(request, env.sessionSecret)) {
    return errorResponse(401, 'Sesión no válida o expirada.')
  }
  return null
}

function checkOrigin(request: Request): Response | null {
  return isAllowedOrigin(request) ? null : errorResponse(403, 'Origen no permitido.')
}

function completeInput(value: Partial<BlogPostInput>): BlogPostInput | null {
  if (
    value.title === undefined ||
    value.excerpt === undefined ||
    value.contentMarkdown === undefined ||
    value.status === undefined
  ) {
    return null
  }

  return {
    title: value.title,
    slug: value.slug,
    excerpt: value.excerpt,
    contentMarkdown: value.contentMarkdown,
    coverImage: value.coverImage ?? null,
    status: value.status
  }
}

async function buildForChange(
  deps: HandlerDeps,
  previous: BlogPostRecord | null,
  next: BlogPostRecord | null
): Promise<BuildResult> {
  if (!shouldTriggerBuild(previous, next)) return { triggered: false }
  return triggerBuild(deps.env.buildHookUrl, fetchImpl(deps))
}

/** Borra las imágenes del artículo sin revertir su eliminación si Blobs falla. */
async function deletePostImages(store: BlogStore, keys: string[]): Promise<ImageCleanupResult> {
  const deleted: string[] = []
  const failed: string[] = []

  for (const key of keys) {
    try {
      await store.deleteImage(key)
      deleted.push(key)
    } catch {
      failed.push(key)
    }
  }

  return {
    deleted: deleted.length,
    ...(failed.length > 0
      ? {
          warning: `No se pudieron eliminar ${failed.length} ${
            failed.length === 1 ? 'imagen' : 'imágenes'
          } del artículo.`
        }
      : {})
  }
}

function toPublicPost(post: BlogPostRecord): PublicBlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt as string,
    updatedAt: post.updatedAt
  }
}

function postIdFrom(request: Request): string | null {
  const id = new URL(request.url).searchParams.get('id')?.trim()
  return id ? id : null
}

export function createLoginHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return methodNotAllowed('POST')

    const originError = checkOrigin(request)
    if (originError) return originError
    if (!deps.env.adminPassword || !deps.env.sessionSecret) {
      return errorResponse(503, 'La administración del blog no está configurada.')
    }

    const body = await readJson(request)
    const password =
      typeof body === 'object' && body !== null && 'password' in body
        ? (body as { password?: unknown }).password
        : undefined

    if (typeof password !== 'string' || password.length === 0) {
      return errorResponse(400, 'Ingresa tu contraseña.')
    }

    const key = `login:${hashIp(getRequestIp(request))}`
    const current = now(deps)
    const rate = await loginRateLimit(deps.store, key, current.getTime())
    if (rate.limited) {
      return errorResponse(
        429,
        'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
        undefined,
        { 'Retry-After': String(rate.retryAfterSeconds) }
      )
    }

    if (!verifyPassword(password, deps.env.adminPassword)) {
      await recordLoginFailure(deps.store, key, rate.attempts, current.getTime())
      return errorResponse(401, 'Contraseña incorrecta.')
    }

    await clearLoginFailures(deps.store, key)
    const token = createSessionToken(deps.env.sessionSecret, current.getTime())
    return adminJson({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, token) })
  }
}

export function createSessionHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET') return methodNotAllowed('GET')
    if (!deps.env.sessionSecret) {
      return errorResponse(503, 'La administración del blog no está configurada.')
    }
    if (!hasValidSession(request, deps.env.sessionSecret)) {
      return errorResponse(401, 'Sesión no válida o expirada.')
    }
    return adminJson({ authenticated: true })
  }
}

export function createLogoutHandler() {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return methodNotAllowed('POST')
    const originError = checkOrigin(request)
    if (originError) return originError

    return adminJson({ ok: true }, 200, {
      'Set-Cookie': expiredSessionCookie(request)
    })
  }
}

export function createAdminPostsHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    const authError = requireAdmin(request, deps.env)
    if (authError) return authError

    const method = request.method
    if (method === 'GET') {
      const posts = await deps.store.listPosts()
      posts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      return adminJson({ posts } satisfies AdminPostsResponse)
    }

    const originError = checkOrigin(request)
    if (originError) return originError

    if (method === 'POST') {
      const body = await readJson(request)
      if (body === undefined) return errorResponse(400, 'El cuerpo de la solicitud no es válido.')

      const result = validatePostInput(body)
      if (!result.ok) return errorResponse(400, 'Revisa los campos del artículo.', result.fields)

      const input = completeInput(result.value)
      if (!input) return errorResponse(400, 'Faltan campos obligatorios.')

      const posts = await deps.store.listPosts()
      const slug = ensureUniqueSlug(input.slug || slugify(input.title), posts)
      const timestamp = now(deps).toISOString()
      const status: BlogStatus = input.status
      const post: BlogPostRecord = {
        id: randomId(deps),
        slug,
        title: input.title,
        excerpt: input.excerpt,
        contentMarkdown: input.contentMarkdown,
        contentHtml: renderMarkdown(input.contentMarkdown),
        coverImage: input.coverImage,
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
        publishedAt: status === 'published' ? timestamp : null
      }

      await deps.store.savePost(post)
      const build = await buildForChange(deps, null, post)
      return adminJson({ post, build } satisfies BlogPostMutationResult, 201)
    }

    if (method === 'PATCH') {
      const id = postIdFrom(request)
      if (!id) return errorResponse(400, 'Falta el identificador del artículo.')

      const existing = await deps.store.getPost(id)
      if (!existing) return errorResponse(404, 'Artículo no encontrado.')

      const body = await readJson(request)
      if (body === undefined) return errorResponse(400, 'El cuerpo de la solicitud no es válido.')

      const result = validatePostInput(body, { partial: true })
      if (!result.ok) return errorResponse(400, 'Revisa los campos del artículo.', result.fields)

      const posts = await deps.store.listPosts()
      const timestamp = now(deps).toISOString()
      const status = result.value.status ?? existing.status
      const contentMarkdown = result.value.contentMarkdown ?? existing.contentMarkdown
      const slug =
        result.value.slug !== undefined
          ? ensureUniqueSlug(result.value.slug, posts, existing.id)
          : existing.slug

      const post: BlogPostRecord = {
        ...existing,
        slug,
        title: result.value.title ?? existing.title,
        excerpt: result.value.excerpt ?? existing.excerpt,
        contentMarkdown,
        contentHtml: renderMarkdown(contentMarkdown),
        coverImage:
          result.value.coverImage !== undefined ? result.value.coverImage : existing.coverImage,
        status,
        updatedAt: timestamp,
        publishedAt:
          status === 'published' && existing.publishedAt === null
            ? timestamp
            : existing.publishedAt
      }

      await deps.store.savePost(post)
      const build = await buildForChange(deps, existing, post)
      return adminJson({ post, build } satisfies BlogPostMutationResult)
    }

    if (method === 'DELETE') {
      const id = postIdFrom(request)
      if (!id) return errorResponse(400, 'Falta el identificador del artículo.')

      const existing = await deps.store.getPost(id)
      if (!existing) return errorResponse(404, 'Artículo no encontrado.')

      const keys = postImageKeys(existing)
      const keysInOtherPosts = new Set(
        (await deps.store.listPosts())
          .filter((item) => item.id !== id)
          .flatMap(postImageKeys)
      )

      await deps.store.deletePost(id)
      const images = await deletePostImages(
        deps.store,
        keys.filter((key) => !keysInOtherPosts.has(key))
      )
      const build = await buildForChange(deps, existing, null)
      return adminJson({ ok: true, build, images } satisfies BlogDeleteResult)
    }

    return methodNotAllowed('GET, POST, PATCH, DELETE')
  }
}

export function createAdminImagesHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    const authError = requireAdmin(request, deps.env)
    if (authError) return authError
    if (request.method !== 'POST') return methodNotAllowed('POST')

    const originError = checkOrigin(request)
    if (originError) return originError

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return errorResponse(400, 'Envía la imagen como formulario multipart.')
    }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return errorResponse(400, 'Selecciona una imagen para subir.')
    }

    const validation = await validateImageFile(file as unknown as UploadedImageFile)
    if (!validation.ok) return errorResponse(400, validation.error)

    const key = `image:${randomId(deps)}`
    await deps.store.saveImage(key, {
      data: validation.data,
      metadata: {
        contentType: validation.contentType,
        originalName: typeof file.name === 'string' ? file.name : undefined,
        size: validation.data.byteLength
      }
    })

    return adminJson({ url: imageUrl(key), key }, 201)
  }
}

export function createAdminBuildHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    const authError = requireAdmin(request, deps.env)
    if (authError) return authError
    if (request.method !== 'POST') return methodNotAllowed('POST')

    const originError = checkOrigin(request)
    if (originError) return originError

    const build = await triggerBuild(deps.env.buildHookUrl, fetchImpl(deps))
    return adminJson(build)
  }
}

export function createPublicPostsHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET') return methodNotAllowed('GET')

    const posts = (await deps.store.listPosts())
      .filter((post) => post.status === 'published' && post.publishedAt !== null)
      .map(toPublicPost)
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))

    return publicJson({ posts })
  }
}

export function createPublicImageHandler(deps: HandlerDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return methodNotAllowed('GET, HEAD')
    }

    const key = new URL(request.url).searchParams.get('key')
    if (!isValidImageKey(key)) return publicErrorResponse(404, 'Imagen no encontrada.')

    const image = await deps.store.getImage(key)
    if (!image) return publicErrorResponse(404, 'Imagen no encontrada.')

    const headers: Record<string, string> = {
      'Content-Type': image.metadata.contentType,
      'Content-Length': String(image.data.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
    if (image.etag) headers.ETag = image.etag

    if (image.etag && request.headers.get('if-none-match') === image.etag) {
      return new Response(null, { status: 304, headers })
    }

    return new Response(request.method === 'HEAD' ? null : image.data, { headers })
  }
}
