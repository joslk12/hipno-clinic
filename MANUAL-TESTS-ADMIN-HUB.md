# Manual de pruebas — add-admin-hub

Instrucciones Manuales Para Crear Y Ajustar Las Pruebas Del Change `add-admin-hub`. Aplica primero `MANUAL-FILES-ADMIN-HUB.md`.

---

## 1. CREAR `src/components/admin/__tests__/admin-nav.spec.ts`

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminNav from '../AdminNav.vue'

afterEach(() => cleanup())

function renderNav(
  props: {
    active?: 'inicio' | 'blog' | 'resenas' | 'citas'
    appointmentsAvailable?: boolean
  } = {}
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', component: { render: () => null } },
      { path: '/admin/blog', component: { render: () => null } },
      { path: '/admin/resenas', component: { render: () => null } },
      { path: '/admin/citas', component: { render: () => null } }
    ]
  })

  return render(AdminNav, { props, global: { plugins: [router] } })
}

describe('AdminNav', () => {
  it('muestra los enlaces y marca la sección activa', () => {
    renderNav({ active: 'resenas' })

    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reseñas' })).toHaveAttribute('aria-current', 'page')
  })

  it('muestra Citas deshabilitada mientras no esté la ruta', () => {
    renderNav()

    expect(screen.getByText(/Próximamente/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Citas' })).not.toBeInTheDocument()
  })

  it('habilita Citas cuando la ruta está disponible', () => {
    renderNav({ appointmentsAvailable: true })

    expect(screen.getByRole('link', { name: 'Citas' })).toBeInTheDocument()
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument()
  })

  it('emite logout al pulsar el botón', async () => {
    const { emitted } = renderNav()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(emitted().logout).toHaveLength(1)
  })
})
```

---

## 2. CREAR `src/views/admin/__tests__/admin-hub-view.spec.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminHubView from '../AdminHubView.vue'
import { createTestHead } from '../../../test/createTestHead'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data
  }
}

function mockFetch(options: { session?: number; sessionError?: string } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/admin/session') {
      if (options.session === 500) {
        return Promise.resolve(
          jsonResponse({ error: options.sessionError ?? 'No disponible.' }, 500)
        )
      }
      return Promise.resolve(
        options.session === 401
          ? jsonResponse({ authenticated: false }, 401)
          : jsonResponse({ authenticated: true })
      )
    }
    if (url === '/api/admin/login' || url === '/api/admin/logout') {
      return Promise.resolve(jsonResponse({ ok: true }))
    }
    return Promise.resolve(jsonResponse({}))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', component: AdminHubView },
      { path: '/admin/blog', component: { render: () => null } },
      { path: '/admin/resenas', component: { render: () => null } }
    ]
  })
  await router.push('/admin')
  await router.isReady()

  return render(AdminHubView, { global: { plugins: [router, createTestHead()] } })
}

describe('AdminHubView', () => {
  it('muestra el menú cuando hay sesión válida', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/session', expect.anything())
    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Blog', exact: true })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reseñas', exact: true })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
  })

  it('pide login sin sesión y entra tras autenticarse', async () => {
    mockFetch({ session: 401 })
    await renderView()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()
    )
  })

  it('muestra el error de verificación sin exponer el menú', async () => {
    mockFetch({ session: 500, sessionError: 'Servicio no disponible.' })
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Servicio no disponible.')
    )
    expect(screen.queryByRole('navigation', { name: 'Administración' })).not.toBeInTheDocument()
  })

  it('cierra sesión desde el menú', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', expect.anything())
  })
})
```

---

## 3. EDITAR `src/router/__tests__/router.spec.ts`

En el arreglo de rutas administrativas, agrega la primera entrada:

```ts
  it.each([
    ['/admin', 'admin-hub'],
    ['/blog/hipnosis-regresiva', 'blog-post'],
    ['/admin/blog', 'admin-blog'],
    ['/admin/resenas', 'admin-reviews']
  ])('resuelve %s con nombre %s', async (path, name) => {
```

---

## 4. EDITAR `src/views/admin/__tests__/admin-reviews-view.spec.ts`

Sustituye el arreglo `routes` de `renderView()` para que `AdminNav` pueda resolver todos sus enlaces:

```ts
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', component: { render: () => null } },
      { path: '/admin/blog', component: { render: () => null } },
      { path: '/admin/resenas', component: AdminReviewsView }
    ]
  })
```

> El resto del archivo no cambia: el botón «Cerrar sesión» que buscaba la prueba ahora lo aporta `AdminNav`.

---

## 5. CREAR `tests/e2e/admin-hub.spec.ts`

```ts
import { expect, test, type Page, type Route } from '@playwright/test'

function json(route: Route, status: number, payload: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  })
}

async function mockAdminApi(page: Page) {
  let authenticated = false

  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()

    if (path === '/api/admin/session') {
      return json(route, authenticated ? 200 : 401, { authenticated })
    }
    if (path === '/api/admin/login' && method === 'POST') {
      authenticated = true
      return json(route, 200, { ok: true })
    }
    if (path === '/api/admin/logout' && method === 'POST') {
      authenticated = false
      return json(route, 200, { ok: true })
    }
    if (path === '/api/admin/blog/posts') {
      return json(route, 200, { posts: [] })
    }
    if (path === '/api/admin/review-clients') {
      return json(route, 200, { clients: [] })
    }
    if (path === '/api/admin/review-invitations') {
      return json(route, 200, {
        invitations: [],
        channels: { email: true, whatsapp: true }
      })
    }
    return json(route, 404, { error: 'No encontrado' })
  })
}

async function loginFromHub(page: Page) {
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()
}

test('pide login y muestra el hub con la sesión', async ({ page }) => {
  await mockAdminApi(page)

  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
  await loginFromHub(page)
  await expect(page.getByRole('navigation', { name: 'Administración' })).toBeVisible()
})

test('navega entre el hub, blog y reseñas sin volver a iniciar sesión', async ({ page }) => {
  await mockAdminApi(page)

  await page.goto('/admin')
  await loginFromHub(page)

  await page.getByRole('link', { name: 'Blog', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/blog$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Artículos del blog' })).toBeVisible()

  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()

  await page.getByRole('link', { name: 'Reseñas', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/resenas$/)
  await expect(page.getByRole('heading', { name: 'Reseñas por invitación' })).toBeVisible()
})

test('cierra sesión desde el menú y protege las secciones', async ({ page }) => {
  await mockAdminApi(page)

  await page.goto('/admin')
  await loginFromHub(page)

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()

  await page.goto('/admin/resenas')
  await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
})

test('muestra Citas como próximamente en el menú', async ({ page }) => {
  await mockAdminApi(page)

  await page.goto('/admin')
  await loginFromHub(page)

  const nav = page.getByRole('navigation', { name: 'Administración' })
  await expect(nav.getByText(/Próximamente/)).toBeVisible()
  await expect(nav.getByRole('link', { name: /Citas/ })).toHaveCount(0)
})
```

> Los selectores con `exact: true` son necesarios porque en el hub hay un enlace del menú y una tarjeta con el mismo texto.

---

## 6. Ajustes en pruebas existentes

No debería hacer falta cambiar `tests/e2e/admin-blog.spec.ts` ni `tests/e2e/admin-reviews.spec.ts`: el botón «Cerrar sesión» ahora lo aporta `AdminNav` y sigue siendo el único con ese nombre.

Si aparece un error de ambigüedad por el menú, usa selectores por rol y nombre exacto:

```ts
page.getByRole('link', { name: 'Blog', exact: true })
page.getByRole('button', { name: 'Cerrar sesión', exact: true })
```

---

## Verificación

```bash
npx vitest run src/components/admin/__tests__/admin-nav.spec.ts \
  src/views/admin/__tests__/admin-hub-view.spec.ts \
  src/views/admin/__tests__/admin-reviews-view.spec.ts \
  src/router

npx playwright test tests/e2e/admin-hub.spec.ts
npx playwright test tests/e2e/admin-blog.spec.ts tests/e2e/admin-reviews.spec.ts
npx playwright test tests/e2e/a11y.spec.ts

npx vitest run
npm run typecheck
npm run lint
npm run build
npx playwright test

test ! -f dist/admin.html && echo 'sin dist/admin.html'
grep -q 'Disallow: /admin' dist/robots.txt && echo 'robots OK'
! grep -q '/admin' dist/sitemap.xml && echo 'sitemap OK'
openspec validate add-admin-hub --strict
```

Después de ejecutar todo, marca `- [ ]` → `- [x]` en `openspec/changes/add-admin-hub/tasks.md` solo para las tareas verificadas.
