<script setup lang="ts">
import type { BlogPostRecord } from '../../types/blog'
import { formatBlogDate } from '../../content/blog'
import BaseButton from '../ui/BaseButton.vue'

defineProps<{
  posts: BlogPostRecord[]
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  create: []
  edit: [post: BlogPostRecord]
  delete: [post: BlogPostRecord]
  rebuild: []
  refresh: []
}>()
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-12 md:px-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">Artículos del blog</h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton size="sm" @click="emit('create')">Nuevo artículo</BaseButton>
        <BaseButton variant="secondary" size="sm" @click="emit('rebuild')">
          Reconstruir sitio
        </BaseButton>
      </div>
    </div>

    <div
      v-if="loading"
      class="mt-8 flex items-center gap-3 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      Cargando artículos…
    </div>

    <div
      v-else-if="error"
      class="mt-8 rounded-xl border border-red-500/40 bg-red-500/10 p-5"
      role="alert"
    >
      <p class="font-body text-sm text-red-500">{{ error }}</p>
      <BaseButton class="mt-4" variant="secondary" size="sm" @click="emit('refresh')">
        Reintentar
      </BaseButton>
    </div>

    <div
      v-else-if="posts.length === 0"
      class="mt-8 rounded-2xl border border-border bg-surface-alt p-8 text-center"
    >
      <p class="font-display text-2xl font-semibold text-accent">Aún no hay artículos</p>
      <p class="mt-2 font-body text-sm text-text-muted">
        Crea tu primer borrador y publícalo cuando esté listo.
      </p>
    </div>

    <ul v-else class="mt-8 space-y-3">
      <li
        v-for="post in posts"
        :key="post.id"
        class="rounded-xl border border-border bg-surface p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="break-words font-display text-xl font-semibold text-accent">
                {{ post.title }}
              </h2>
              <span
                class="rounded-full border border-border px-2 py-0.5 font-body text-[0.65rem] font-semibold uppercase tracking-[0.14em]"
                :class="post.status === 'published' ? 'text-accent' : 'text-text-muted'"
              >
                {{ post.status === 'published' ? 'Publicado' : 'Borrador' }}
              </span>
            </div>
            <p class="mt-1 break-all font-body text-xs text-text-muted">/blog/{{ post.slug }}</p>
            <p class="mt-2 font-body text-xs text-text-muted">
              Actualizado: {{ formatBlogDate(post.updatedAt) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="secondary" size="sm" @click="emit('edit', post)">
              Editar
            </BaseButton>
            <button
              type="button"
              class="min-h-9 rounded-md px-3 font-body text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
              @click="emit('delete', post)"
            >
              Eliminar
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
