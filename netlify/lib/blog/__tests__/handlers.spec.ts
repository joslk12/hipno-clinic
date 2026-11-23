import { describe, expect, it, vi } from 'vitest'
import type { BlogDeleteResult, BlogPostRecord } from '../../../../src/types/blog'
import { createSessionToken } from '../auth'
import {
  createAdminBuildHandler,
  createAdminImagesHandler,
  createAdminPostsHandler,
  createLoginHandler,
  createLogoutHandler,
  createPublicImageHandler,
  createPublicPostsHandler,
  createSessionHandler
} from '../handlers'
import { createMemoryBlogStore } from '../store'

const env = {
  adminPassword: 'clave-segura',
  sessionSecret: 'secreto-de-sesion',
  buildHookUrl: 'https://hook.test/build'
}
const token = createSessionToken(env.sessionSecret)
const now = () => new Date('2026-03-01T12:00:00.000Z')

function adminRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cookie', `oc_admin_session=${token}`)
  headers.set('origin', 'https://sitio.test')
  return new Request(`https://sitio.test${path}`, { ...init, headers })
}

function jsonRequest(path: string, method: string, body: unknown) {
  return adminRequest(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function post(overrides: Partial<BlogPostRecord> = {}): BlogPostRecord {
  return {
    id: 'uno',
    slug: 'articulo',
    title: 'Artículo de prueba',
    excerpt: 'Un resumen suficientemente largo para cumplir con la validación del blog.',
    contentMarkdown: '## Contenido\n\nEste es un contenido suficientemente largo para validar.',
    contentHtml: '<h2>Contenido</h2>',
    coverImage: null,
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: null,
    ...overrides
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Nuevo artículo',
    excerpt: 'Un resumen suficientemente largo para cumplir con la validación del blog.',
    contentMarkdown: '## Contenido\n\nEste es un contenido suficientemente largo para validar.',
    coverImage: null,
    status: 'published',
    ...overrides
  }
}

function okFetch() {
  return vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch
}

function imageRecord() {
  return {
    data: new Uint8Array([1, 2, 3]).buffer,
    metadata: { contentType: 'image/png' }
  }
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

describe('blog handlers', () => {
  it('inicia sesión, limita intentos y cierra sesión', async () => {
    const store = createMemoryBlogStore()
    const loginHandler = createLoginHandler({
      store,
      env,
      now: () => new Date('2026-01-01T00:00:00.000Z')
    })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginHandler(
        new Request('https://sitio.test/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
          body: JSON.stringify({ password: 'incorrecta' })
        })
      )
      expect(response.status).toBe(401)
    }

    const blocked = await loginHandler(
      new Request('https://sitio.test/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        body: JSON.stringify({ password: 'clave-segura' })
      })
    )
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()

    const freshStore = createMemoryBlogStore()
    const freshLogin = createLoginHandler({ store: freshStore, env })
    const success = await freshLogin(
      new Request('https://sitio.test/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'clave-segura' })
      })
    )
    expect(success.status).toBe(200)
    expect(success.headers.get('set-cookie')).toContain('oc_admin_session=')
    expect(success.headers.get('set-cookie')).toContain('HttpOnly')

    const logout = createLogoutHandler()
    const logoutResponse = await logout(
      new Request('https://sitio.test/api/admin/logout', {
        method: 'POST',
        headers: { origin: 'https://sitio.test' }
      })
    )
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('protege la sesión y exige configuración', async () => {
    const store = createMemoryBlogStore()
    const session = createSessionHandler({ store, env })
    expect((await session(adminRequest('/api/admin/session'))).status).toBe(200)
    expect(
      (await session(new Request('https://sitio.test/api/admin/session'))).status
    ).toBe(401)

    const unconfigured = createSessionHandler({ store, env: {} })
    expect(
      (await unconfigured(new Request('https://sitio.test/api/admin/session'))).status
    ).toBe(503)
  })

  it('crea artículos, genera slug único y dispara el build al publicar', async () => {
    const store = createMemoryBlogStore({ posts: [post()] })
    const fetchMock = okFetch()
    const handler = createAdminPostsHandler({
      store,
      env,
      now,
      randomId: () => 'nuevo',
      fetchImpl: fetchMock
    })

    const response = await handler(
      jsonRequest('/api/admin/blog/posts', 'POST', input({ title: 'Artículo' }))
    )
    expect(response.status).toBe(201)
    const payload = await json<{ post: BlogPostRecord; build: { triggered: boolean } }>(response)
    expect(payload.post.slug).toBe('articulo-2')
    expect(payload.post.publishedAt).toBe('2026-03-01T12:00:00.000Z')
    expect(payload.post.contentHtml).toContain('<h2>Contenido</h2>')
    expect(payload.build.triggered).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('no dispara build al guardar un borrador', async () => {
    const store = createMemoryBlogStore()
    const fetchMock = okFetch()
    const handler = createAdminPostsHandler({
      store,
      env,
      now,
      randomId: () => 'borrador',
      fetchImpl: fetchMock
    })

    const response = await handler(
      jsonRequest('/api/admin/blog/posts', 'POST', input({ status: 'draft' }))
    )
    expect(response.status).toBe(201)
    expect((await json<{ build: { triggered: boolean } }>(response)).build.triggered).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('actualiza, despublica y elimina artículos con rebuild cuando corresponde', async () => {
    const draft = post({ id: 'draft', slug: 'borrador' })
    const published = post({
      id: 'pub',
      slug: 'publicado',
      status: 'published',
      publishedAt: '2026-02-01T00:00:00.000Z'
    })
    const store = createMemoryBlogStore({ posts: [draft, published] })
    const fetchMock = okFetch()
    const handler = createAdminPostsHandler({
      store,
      env,
      now,
      fetchImpl: fetchMock
    })

    const publish = await handler(
      jsonRequest('/api/admin/blog/posts?id=draft', 'PATCH', { status: 'published' })
    )
    expect(publish.status).toBe(200)
    expect((await json<{ post: BlogPostRecord }>(publish)).post.publishedAt).toBe('2026-03-01T12:00:00.000Z')

    const unpublish = await handler(
      jsonRequest('/api/admin/blog/posts?id=pub', 'PATCH', { status: 'draft' })
    )
    const unpublishBody = await json<{ post: BlogPostRecord }>(unpublish)
    expect(unpublishBody.post.status).toBe('draft')
    expect(unpublishBody.post.publishedAt).toBe('2026-02-01T00:00:00.000Z')

    const remove = await handler(
      adminRequest('/api/admin/blog/posts?id=draft', { method: 'DELETE' })
    )
    expect(remove.status).toBe(200)
    expect(await store.getPost('draft')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('elimina las imágenes del artículo y conserva las que usa otro artículo', async () => {
    const target = post({
      id: 'borrar',
      coverImage: '/api/blog/images?key=image:portada',
      contentMarkdown: '![cuerpo](/api/blog/images?key=image:cuerpo)',
      contentHtml: '<img src="/api/blog/images?key=image:cuerpo" />'
    })
    const other = post({
      id: 'otro',
      slug: 'otro',
      coverImage: '/api/blog/images?key=image:portada'
    })
    const store = createMemoryBlogStore({
      posts: [target, other],
      images: [
        ['image:portada', imageRecord()],
        ['image:cuerpo', imageRecord()],
        ['image:ajena', imageRecord()]
      ]
    })
    const handler = createAdminPostsHandler({ store, env, now, fetchImpl: okFetch() })

    const response = await handler(
      adminRequest('/api/admin/blog/posts?id=borrar', { method: 'DELETE' })
    )
    expect(response.status).toBe(200)
    expect(await store.getPost('borrar')).toBeNull()
    expect(await store.getImage('image:cuerpo')).toBeNull()
    expect(await store.getImage('image:portada')).not.toBeNull()
    expect(await store.getImage('image:ajena')).not.toBeNull()
    expect((await json<BlogDeleteResult>(response)).images).toEqual({ deleted: 1 })
  })

  it('avisa si falla la limpieza de imágenes sin revertir el borrado', async () => {
    const target = post({
      id: 'borrar',
      coverImage: '/api/blog/images?key=image:portada',
      contentMarkdown: '![cuerpo](/api/blog/images?key=image:cuerpo)'
    })
    const store = createMemoryBlogStore({
      posts: [target],
      images: [
        ['image:portada', imageRecord()],
        ['image:cuerpo', imageRecord()]
      ]
    })
    const original = store.deleteImage.bind(store)
    vi.spyOn(store, 'deleteImage').mockImplementation(async (key) => {
      if (key === 'image:cuerpo') throw new Error('Blobs no disponible')
      await original(key)
    })
    const handler = createAdminPostsHandler({ store, env, now, fetchImpl: okFetch() })

    const response = await handler(
      adminRequest('/api/admin/blog/posts?id=borrar', { method: 'DELETE' })
    )
    const body = await json<BlogDeleteResult>(response)
    expect(await store.getPost('borrar')).toBeNull()
    expect(await store.getImage('image:portada')).toBeNull()
    expect(body.images.deleted).toBe(1)
    expect(body.images.warning).toContain('No se pudieron eliminar 1 imagen')
  })

  it('lista artículos para administración y publica solo los publicados', async () => {
    const store = createMemoryBlogStore({
      posts: [
        post({ id: 'draft', slug: 'borrador' }),
        post({
          id: 'pub',
          slug: 'publicado',
          status: 'published',
          publishedAt: '2026-02-01T00:00:00.000Z'
        })
      ]
    })
    const admin = createAdminPostsHandler({ store, env })
    const list = await admin(adminRequest('/api/admin/blog/posts'))
    expect((await json<{ posts: BlogPostRecord[] }>(list)).posts).toHaveLength(2)

    const publicList = createPublicPostsHandler({ store, env })
    const response = await publicList(new Request('https://sitio.test/api/blog/posts'))
    const body = await json<{ posts: Array<Record<string, unknown>> }>(response)
    expect(body.posts).toHaveLength(1)
    expect(body.posts[0].slug).toBe('publicado')
    expect(body.posts[0].contentMarkdown).toBeUndefined()
  })

  it('sube imágenes y las sirve públicamente con ETag', async () => {
    const store = createMemoryBlogStore()
    const handler = createAdminImagesHandler({ store, env, randomId: () => 'foto' })
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const uploadedFile = {
      name: 'foto.png',
      size: imageBytes.byteLength,
      type: 'image/png',
      arrayBuffer: async () => imageBytes.buffer
    }
    const uploadRequest = {
      method: 'POST',
      url: 'https://sitio.test/api/admin/blog/images',
      headers: new Headers({
        cookie: `oc_admin_session=${token}`,
        origin: 'https://sitio.test'
      }),
      formData: async () => ({ get: () => uploadedFile })
    } as unknown as Request

    const upload = await handler(uploadRequest)
    const uploadBody = await json<{ url: string }>(upload)
    expect(upload.status).toBe(201)
    expect(uploadBody.url).toBe('/api/blog/images?key=image:foto')

    await store.saveImage('image:foto', {
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
      etag: '"abc"',
      metadata: { contentType: 'image/png' }
    })

    const imageHandler = createPublicImageHandler({ store, env })
    const image = await imageHandler(
      new Request('https://sitio.test/api/blog/images?key=image:foto')
    )
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(image.headers.get('etag')).toBe('"abc"')

    const cached = await imageHandler(
      new Request('https://sitio.test/api/blog/images?key=image:foto', {
        headers: { 'if-none-match': '"abc"' }
      })
    )
    expect(cached.status).toBe(304)

    const missing = await imageHandler(
      new Request('https://sitio.test/api/blog/images?key=image:no-existe')
    )
    expect(missing.status).toBe(404)
  })

  it('permite reconstruir manualmente el sitio', async () => {
    const fetchMock = okFetch()
    const handler = createAdminBuildHandler({
      store: createMemoryBlogStore(),
      env,
      fetchImpl: fetchMock
    })
    const response = await handler(
      adminRequest('/api/admin/blog/build', { method: 'POST' })
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ triggered: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
