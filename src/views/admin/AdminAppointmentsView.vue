<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminAvailabilityEditor from '../../components/admin/AdminAvailabilityEditor.vue'
import AdminAppointmentList from '../../components/admin/AdminAppointmentList.vue'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import AdminNav from '../../components/admin/AdminNav.vue'
import { usePageMeta } from '../../composables/usePageMeta'
import { AdminBlogApiError, getSession, logout } from '../../services/adminBlog'

usePageMeta({
  title: 'Administración de citas | Origen Consciente',
  description: 'Área privada para administrar la disponibilidad y las citas de Origen Consciente.',
  path: '/admin/citas',
  robots: 'noindex, nofollow'
})

const checking = ref(true)
const authenticated = ref(false)
const notice = ref('')
const error = ref('')

function resetSession() {
  authenticated.value = false
  notice.value = ''
}

async function checkSession() {
  checking.value = true

  try {
    await getSession()
    authenticated.value = true
  } catch (caught) {
    if (!(caught instanceof AdminBlogApiError && caught.status === 401)) {
      error.value =
        caught instanceof AdminBlogApiError
          ? caught.message
          : 'No pudimos verificar la sesión.'
    }
  } finally {
    checking.value = false
  }
}

function handleAuthenticated() {
  authenticated.value = true
  error.value = ''
}

function handleUnauthorized() {
  resetSession()
  error.value = 'Tu sesión expiró. Ingresa de nuevo.'
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    resetSession()
  }
}

onMounted(checkSession)
</script>

<template>
  <div>
    <div v-if="notice" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-accent/40 bg-accent-satin/10 p-4" role="status" aria-live="polite">
        <p class="font-body text-sm text-text">{{ notice }}</p>
      </div>
    </div>

    <div v-if="error" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert" aria-live="polite">
        <p class="font-body text-sm text-red-500">{{ error }}</p>
      </div>
    </div>

    <AdminNav
      v-if="authenticated"
      active="citas"
      :appointments-available="true"
      @logout="handleLogout"
    />

    <div
      v-if="checking"
      class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      Verificando sesión…
    </div>

    <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

    <div v-else class="mx-auto max-w-6xl space-y-6 px-4 py-12 md:px-8">
      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">Citas</h1>
        <p class="mt-3 font-body text-sm text-text-muted">
          Publica horarios y revisa las reservas de la clínica.
        </p>
      </div>

      <AdminAvailabilityEditor @unauthorized="handleUnauthorized" @notice="notice = $event" />
      <AdminAppointmentList @unauthorized="handleUnauthorized" @notice="notice = $event" />
    </div>
  </div>
</template>
