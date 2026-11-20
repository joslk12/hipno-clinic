import { expect, test, type Page, type Route } from '@playwright/test'

interface MockPost {
  id: string
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  contentHtml: string
  coverImage: string | null
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

interface MockOptions {
  loginStatus?: number
}

async function mockAdminApi(page: Page, options: MockOptions = {}) {
  let authenticated = false
  const posts: MockPost[] = []
  const mutations: Array<{ method: string; body: Record<string, unknown> }> = []

  await page.route('**/api/admin/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const json = async () => {
      try {
        return (await request.postDataJSON()) as Record<string, unknown>
      } catch {
        return {}
      }
    }

    if (url.pathname === '/api/admin/session') {
      await route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          authenticated ? { authenticated: true } : { error: 'Sesión no válida o expirada.' }
        )
      })
      return
    }

    if (url.pathname === '/api/admin/login') {
      const status = options.loginStatus ?? 200
      if (status === 200) authenticated = true
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(
          status === 200 ? { ok: true } : { error: 'Contraseña incorrecta.' }
        )
      })
      return
    }

    if (url.pathname === '/api/admin/logout') {
      authenticated = false
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
      return
    }

    if (url.pathname === '/api/admin/blog/posts') {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Sesión no válida o expirada.' })
        })
        return
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ posts })
        })
        return
      }

      if (method === 'POST') {
        const body = await json()
        mutations.push({ method, body })
        const timestamp = new Date().toISOString()
        const post: MockPost = {
          id: `post-${posts.length + 1}`,
          slug: String(body.slug ?? 'articulo-de-prueba'),
          title: String(body.title),
          excerpt: String(body.excerpt),
          contentMarkdown: String(body.contentMarkdown),
          contentHtml: '<h2>Primera sección</h2><p>Contenido de prueba.</p>',
          coverImage: null,
          status: body.status === 'published' ? 'published' : 'draft',
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: body.status === 'published' ? timestamp : null
        }
        posts.push(post)
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            post,
            build: { triggered: post.status === 'published' }
          })
        })
        return
      }

      if (method === 'PATCH') {
        const body = await json()
        mutations.push({ method, body })
        const post = posts.find((item) => item.id === url.searchParams.get('id'))
        if (!post) {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'No encontrado.' }) })
          return
        }
        post.title = String(body.title ?? post.title)
        post.excerpt = String(body.excerpt ?? post.excerpt)
        post.contentMarkdown = String(body.contentMarkdown ?? post.contentMarkdown)
        post.contentHtml = '<h2>Primera sección</h2><p>Contenido actualizado.</p>'
        post.status = body.status === 'published' ? 'published' : 'draft'
        post.updatedAt = new Date().toISOString()
        if (post.status === 'published' && !post.publishedAt) {
          post.publishedAt = post.updatedAt
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            post,
            build: { triggered: post.status === 'published' }
          })
        })
        return
      }

      if (method === 'DELETE') {
        const id = url.searchParams.get('id')
        const index = posts.findIndex((item) => item.id === id)
        if (index >= 0) posts.splice(index, 1)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, build: { triggered: true } })
        })
        return
      }
    }

    if (url.pathname === '/api/admin/blog/images') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/api/blog/images?key=image:test', key: 'image:test' })
      })
      return
    }

    if (url.pathname === '/api/admin/blog/build') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ triggered: true })
      })
      return
    }

    await route.fulfill({ status: 404, body: JSON.stringify({ error: 'No encontrado.' }) })
  })

  return { posts, mutations }
}

test('muestra el error cuando la contraseña es incorrecta', async ({ page }) => {
  await mockAdminApi(page, { loginStatus: 401 })
  await page.goto('/admin/blog')

  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
  await page.getByLabel('Contraseña').fill('incorrecta')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByText('Contraseña incorrecta.')).toBeVisible()
})

test('permite iniciar sesión, crear, previsualizar, publicar, reconstruir y salir', async ({
  page
}) => {
  const { mutations } = await mockAdminApi(page)
  await page.goto('/admin/blog')

  await page.getByLabel('Contraseña').fill('clave-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Artículos del blog' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo artículo' }).click()
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Artículo de prueba')
  await page.getByLabel('Resumen').fill(
    'Un resumen suficientemente largo para cumplir con la validación del blog.'
  )
  await page.getByLabel('Contenido').fill(
    '## Primera sección\n\nEste es un contenido suficientemente largo para validar el artículo.'
  )
  await expect(page.locator('.blog-content h2').first()).toHaveText('Primera sección')

  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Artículos del blog' })).toBeVisible()
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Artículos del blog' })).toBeVisible()
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible()
  await expect(page.getByText(/reconstrucción del sitio está en curso/i)).toBeVisible()

  await page.getByRole('button', { name: 'Reconstruir sitio' }).click()
  await expect(page.getByText('Reconstrucción del sitio iniciada.')).toBeVisible()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Aún no hay artículos')).toBeVisible()

  expect(mutations[0]).toMatchObject({ method: 'POST', body: { status: 'draft' } })
  expect(mutations[1]).toMatchObject({ method: 'PATCH', body: { status: 'published' } })

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
})
