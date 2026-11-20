# Manual completo — add-admin-hub

Instrucciones Manuales Para Implementar El Change `add-admin-hub` SIN Ejecutar El Flujo De Apply.

Este único archivo contiene:

- **Parte 1 — Código**: contenido íntegro de los archivos nuevos y parches exactos de los archivos existentes.
- **Parte 2 — Pruebas**: contenido íntegro de los tests nuevos y ajustes de los tests existentes.
- **Parte 3 — Verificación**: comandos y comprobaciones finales.

Orden de ejecución: Parte 1 (en orden) → Parte 2 (en orden) → Parte 3.

**No modifiques** `vite.config.ts` ni `public/robots.txt`: la exclusión de `/admin` del prerender y de buscadores ya existe. Tampoco se agregan endpoints ni variables de entorno: se reutiliza `BLOG_SESSION_SECRET` y `/api/admin/{session,login,logout}`.

---

# PARTE 1 — CÓDIGO

## 1. CREAR `src/components/admin/AdminNav.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { routes } from '../../router'
import BaseButton from '../ui/BaseButton.vue'

type AdminSection = 'inicio' | 'blog' | 'resenas' | 'citas'

const props = withDefaults(
  defineProps<{
    active?: AdminSection | ''
    appointmentsAvailable?: boolean
  }>(),
  { active: '' }
)

const emit = defineEmits<{ logout: [] }>()

const appointmentsEnabled = computed(
  () => props.appointmentsAvailable ?? routes.some((route) => route.path === '/admin/citas')
)

const sections = computed(() => [
  { key: 'inicio' as const, label: 'Inicio', to: '/admin' },
  { key: 'blog' as const, label: 'Blog', to: '/admin/blog' },
  { key: 'resenas' as const, label: 'Reseñas', to: '/admin/resenas' },
  ...(appointmentsEnabled.value
    ? [{ key: 'citas' as const, label: 'Citas', to: '/admin/citas' }]
    : [])
])
</script>

<template>
  <nav aria-label="Administración" class="border-b border-border bg-surface/60">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
      <RouterLink
        v-for="section in sections"
        :key="section.key"
        :to="section.to"
        :aria-current="active === section.key ? 'page' : undefined"
        :class="[
          'min-h-9 rounded-md px-3 py-2 font-body text-sm font-medium transition-colors',
          active === section.key
            ? 'bg-accent-satin/15 text-accent'
            : 'text-text-muted hover:text-accent'
        ]"
      >
        {{ section.label }}
      </RouterLink>

      <span
        v-if="!appointmentsEnabled"
        aria-disabled="true"
        class="min-h-9 rounded-md px-3 py-2 font-body text-sm text-text-muted/60"
      >
        Citas <span class="text-xs uppercase tracking-wider">(Próximamente)</span>
      </span>

      <BaseButton type="button" variant="ghost" size="sm" class="ml-auto" @click="emit('logout')">
        Cerrar sesión
      </BaseButton>
    </div>
  </nav>
</template>
```

> `appointmentsAvailable` es opcional y solo existe para forzar el estado en pruebas. En producción se deriva de `routes`, así que el enlace se habilita automáticamente cuando `add-appointment-calendar` registre `/admin/citas`.

---

## 2. CREAR `src/views/admin/AdminHubView.vue`

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import AdminNav from '../../components/admin/AdminNav.vue'
import { usePageMeta } from '../../composables/usePageMeta'
import { routes } from '../../router'
import { AdminBlogApiError, getSession, logout } from '../../services/adminBlog'

usePageMeta({
  title: 'Panel de administración | Origen Consciente',
  description: 'Área privada para administrar el blog, las reseñas y las citas.',
  path: '/admin',
  robots: 'noindex, nofollow'
})

const checking = ref(true)
const authenticated = ref(false)
const error = ref('')

const appointmentsAvailable = computed(() =>
  routes.some((route) => route.path === '/admin/citas')
)

async function checkSession() {
  checking.value = true

  try {
    await getSession()
    authenticated.value = true
    error.value = ''
  } catch (caught) {
    if (caught instanceof AdminBlogApiError && caught.status === 401) {
      authenticated.value = false
    } else {
      error.value =
        caught instanceof AdminBlogApiError ? caught.message : 'No pudimos verificar la sesión.'
    }
  } finally {
    checking.value = false
  }
}

function handleAuthenticated() {
  authenticated.value = true
  error.value = ''
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    authenticated.value = false
  }
}

onMounted(checkSession)
</script>

<template>
  <div>
    <div v-if="error" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert">
        <p class="font-body text-sm text-red-500">{{ error }}</p>
      </div>
    </div>

    <div
      v-if="checking"
      class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      Verificando sesión…
    </div>

    <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

    <template v-else>
      <AdminNav active="inicio" @logout="handleLogout" />

      <div class="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">
          Panel de administración
        </h1>
        <p class="mt-3 font-body text-sm text-text-muted">
          Elige una sección para continuar. Todas usan la misma sesión.
        </p>

        <ul class="mt-8 grid gap-4 md:grid-cols-3">
          <li>
            <RouterLink
              to="/admin/blog"
              class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
            >
              <h2 class="font-display text-xl font-semibold text-accent">Blog</h2>
              <p class="mt-2 font-body text-sm text-text-muted">
                Crea, edita y publica artículos.
              </p>
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/admin/resenas"
              class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
            >
              <h2 class="font-display text-xl font-semibold text-accent">Reseñas</h2>
              <p class="mt-2 font-body text-sm text-text-muted">
                Registra clientes y envía ligas privadas.
              </p>
            </RouterLink>
          </li>
          <li>
            <RouterLink
              v-if="appointmentsAvailable"
              to="/admin/citas"
              class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
            >
              <h2 class="font-display text-xl font-semibold text-accent">Citas</h2>
              <p class="mt-2 font-body text-sm text-text-muted">
                Administra disponibilidad y reservas.
              </p>
            </RouterLink>
            <div
              v-else
              aria-disabled="true"
              class="block h-full rounded-xl border border-border bg-surface-alt p-6 opacity-70"
            >
              <h2 class="font-display text-xl font-semibold text-accent">Citas</h2>
              <p class="mt-2 font-body text-sm text-text-muted">Próximamente.</p>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
```

---

## 3. EDITAR `src/router/index.ts`

Inserta esta ruta antes de `/admin/blog`:

```ts
  {
    path: '/admin',
    name: 'admin-hub',
    component: () => import('@/views/admin/AdminHubView.vue')
  },
```

El orden final del bloque administrativo debe ser:

```ts
  {
    path: '/admin',
    name: 'admin-hub',
    component: () => import('@/views/admin/AdminHubView.vue')
  },
  {
    path: '/admin/blog',
    name: 'admin-blog',
    component: () => import('@/views/admin/AdminBlogView.vue')
  },
  {
    path: '/admin/resenas',
    name: 'admin-reviews',
    component: () => import('@/views/admin/AdminReviewsView.vue')
  },
```

---

## 4. EDITAR `src/views/admin/AdminBlogView.vue`

**a)** Agrega el import del menú después de `import AdminLogin ...`:

```ts
import AdminNav from '../../components/admin/AdminNav.vue'
```

**b)** Agrega el menú justo antes del `<div v-if="checking" ...>` del template:

```vue
    <AdminNav v-if="authenticated" active="blog" @logout="handleLogout" />
```

**c)** En `<AdminPostList ...>`, elimina la línea:

```vue
      @logout="handleLogout"
```

El bloque debe quedar así:

```vue
    <AdminPostList
      v-else
      :posts="posts"
      :loading="loadingPosts"
      :error="listError"
      @create="editing = null"
      @edit="editing = $event"
      @delete="handleDelete"
      @rebuild="handleRebuild"
      @refresh="loadPosts"
    />
```

> El botón de cierre de sesión ahora vive en `AdminNav`; por eso se quita el de `AdminPostList` para no tener dos con el mismo nombre accesible.

---

## 5. EDITAR `src/components/admin/AdminPostList.vue`

**a)** Quita `logout: []` del `defineEmits`:

```ts
const emit = defineEmits<{
  create: []
  edit: [post: BlogPostRecord]
  delete: [post: BlogPostRecord]
  rebuild: []
  refresh: []
}>()
```

**b)** Elimina el botón de cierre de sesión del grupo de acciones; el grupo queda así:

```vue
      <div class="flex flex-wrap gap-2">
        <BaseButton size="sm" @click="emit('create')">Nuevo artículo</BaseButton>
        <BaseButton variant="secondary" size="sm" @click="emit('rebuild')">
          Reconstruir sitio
        </BaseButton>
      </div>
```

---

## 6. EDITAR `src/views/admin/AdminReviewsView.vue`

**a)** Agrega el import del menú y elimina el de `BaseButton` (ya no se usa):

```diff
 import AdminLogin from '../../components/admin/AdminLogin.vue'
-import BaseButton from '../../components/ui/BaseButton.vue'
+import AdminNav from '../../components/admin/AdminNav.vue'
```

**b)** Agrega el menú justo antes del `<div v-if="checking" ...>` del template:

```vue
    <AdminNav v-if="authenticated" active="resenas" @logout="handleLogout" />
```

**c)** Elimina el bloque final de cierre de sesión:

```vue
      <div class="flex justify-end">
        <BaseButton variant="ghost" size="sm" @click="handleLogout">Cerrar sesión</BaseButton>
      </div>
```

El último bloque visible debe terminar en el resultado del envío:

```vue
      <div v-if="lastResult" class="rounded-xl border border-border bg-surface p-6">
        ...
      </div>
    </div>
  </div>
</template>
```

---

## 7. EDITAR `README.md`

**a)** Inserta esta sección antes de `## Reseñas de clientas`:

```md
## Panel de administración

La entrada única es `/admin`. Comprueba la sesión administrativa y, si no hay sesión, muestra el mismo formulario de acceso que el blog. Una vez dentro, el menú «Administración» permite ir a:

- **Blog** → `/admin/blog`: artículos, imágenes y reconstrucción del sitio.
- **Reseñas** → `/admin/resenas`: clientes, ligas privadas y reenvíos.
- **Citas** → `/admin/citas`: disponibilidad y reservas (disponible al implementar `add-appointment-calendar`; hasta entonces aparece como «Próximamente»).

Todas las secciones comparten la misma sesión (`BLOG_SESSION_SECRET`), así que no hay que iniciar sesión dos veces. El área no se enlaza desde la navegación pública, no se prerenderiza y robots la desautoriza.

```

**b)** Sustituye en `### Panel /admin/resenas`:

```md
Requiere la misma sesión que `/admin/blog` (`BLOG_SESSION_SECRET`). El flujo es:
```

por:

```md
Se accede desde `/admin` y requiere la sesión administrativa (`BLOG_SESSION_SECRET`). El flujo es:
```

---

## Comprobación rápida de la Parte 1

```bash
grep -n "AdminHubView" src/router/index.ts
grep -n "AdminNav" src/views/admin/AdminBlogView.vue src/views/admin/AdminReviewsView.vue
grep -n "Panel de administración" README.md
npm run typecheck
```

---

# PARTE 2 — PRUEBAS

## 8. CREAR `src/components/admin/__tests__/admin-nav.spec.ts`

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

## 9. CREAR `src/views/admin/__tests__/admin-hub-view.spec.ts`

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

## 10. EDITAR `src/router/__tests__/router.spec.ts`

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

## 11. EDITAR `src/views/admin/__tests__/admin-reviews-view.spec.ts`

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

## 12. CREAR `tests/e2e/admin-hub.spec.ts`

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

## 13. Ajustes en pruebas existentes

No debería hacer falta cambiar `tests/e2e/admin-blog.spec.ts` ni `tests/e2e/admin-reviews.spec.ts`: el botón «Cerrar sesión» ahora lo aporta `AdminNav` y sigue siendo el único con ese nombre.

Si aparece un error de ambigüedad por el menú, usa selectores por rol y nombre exacto:

```ts
page.getByRole('link', { name: 'Blog', exact: true })
page.getByRole('button', { name: 'Cerrar sesión', exact: true })
```

---

# PARTE 3 — VERIFICACIÓN

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

## Seguimiento posterior

- Al implementar `add-appointment-calendar`, comprobar que el enlace «Citas» se habilita solo con registrar `/admin/citas` en el router.
- No archivar `add-review-invitations` hasta sincronizar la spec base `client-reviews` del change `add-client-reviews`.
