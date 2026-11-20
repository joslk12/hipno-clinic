# Manual de archivos — add-admin-hub

Instrucciones Manuales Para Implementar El Change `add-admin-hub` SIN Ejecutar El Flujo De Apply.

Contiene el contenido exacto de los archivos nuevos y los parches de los archivos existentes. No modifiques `vite.config.ts` ni `public/robots.txt`: la exclusión de `/admin` ya existe.

Orden recomendado: menú compartido → hub → router → integración en paneles → documentación → pruebas (ver `MANUAL-TESTS-ADMIN-HUB.md`).

---

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

## Verificación de archivos

```bash
grep -n "AdminHubView" src/router/index.ts
grep -n "AdminNav" src/views/admin/AdminBlogView.vue src/views/admin/AdminReviewsView.vue
grep -n "Panel de administración" README.md
npm run typecheck
```

Continúa con `MANUAL-TESTS-ADMIN-HUB.md`.
