<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import { AdminBlogApiError, login } from '../../services/adminBlog'

const emit = defineEmits<{ authenticated: [] }>()

const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (!password.value) {
    error.value = 'Ingresa tu contraseña.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await login(password.value)
    password.value = ''
    emit('authenticated')
  } catch (caught) {
    error.value =
      caught instanceof AdminBlogApiError
        ? caught.message
        : 'No pudimos iniciar sesión. Inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
    <div class="rounded-2xl border border-border bg-surface p-6 md:p-8">
      <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        Administración
      </p>
      <h1 class="mt-2 font-display text-3xl font-semibold text-accent">Panel de administrador</h1>
      <p class="mt-3 font-body text-sm leading-relaxed text-text-muted">
        Ingresa la contraseña para administrar los artículos del blog, invitación de reseñas y manejo de citas.
      </p>

      <form class="mt-6 space-y-5" @submit.prevent="submit">
        <BaseInput
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="current-password"
          required
          :error="error || undefined"
        />
        <BaseButton type="submit" :loading="loading" class="w-full">
          Entrar
        </BaseButton>
      </form>

      <p class="mt-5 font-body text-xs leading-relaxed text-text-muted">
        La sesión dura 8 horas. Si olvidaste la contraseña, contacta a la persona responsable del
        sitio.
      </p>
    </div>
  </section>
</template>
