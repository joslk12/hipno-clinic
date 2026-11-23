<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type {
  BlogDeleteResult,
  BlogPostMutationResult,
  BlogPostRecord,
  BlogStatus
} from '../../types/blog'
import {
  AdminBlogApiError,
  createPost,
  deletePost,
  updatePost,
  uploadImage
} from '../../services/adminBlog'
import { slugifyTitle } from '../../utils/slug'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import BaseTextarea from '../ui/BaseTextarea.vue'
import MarkdownEditor from './MarkdownEditor.vue'

const props = defineProps<{
  post: BlogPostRecord | null
}>()

const emit = defineEmits<{
  saved: [result: BlogPostMutationResult]
  deleted: [post: BlogPostRecord, result: BlogDeleteResult]
  cancel: []
  unauthorized: []
}>()

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  contentMarkdown: '',
  coverImage: null as string | null
})

const status = ref<BlogStatus>('draft')
const slugTouched = ref(false)
const fields = ref<Record<string, string>>({})
const saving = ref(false)
const savingStatus = ref<BlogStatus | null>(null)
const deleting = ref(false)
const uploadingCover = ref(false)
const actionError = ref('')
const coverError = ref('')
const coverInput = ref<HTMLInputElement | null>(null)

const isNew = computed(() => props.post === null)

watch(
  () => props.post,
  (post) => {
    form.title = post?.title ?? ''
    form.slug = post?.slug ?? ''
    form.excerpt = post?.excerpt ?? ''
    form.contentMarkdown = post?.contentMarkdown ?? ''
    form.coverImage = post?.coverImage ?? null
    status.value = post?.status ?? 'draft'
    slugTouched.value = post !== null
    fields.value = {}
    actionError.value = ''
    coverError.value = ''
  },
  { immediate: true }
)

function updateTitle(value: string) {
  form.title = value
  if (!slugTouched.value) form.slug = value ? slugifyTitle(value) : ''
}

function updateSlug(value: string) {
  form.slug = value
  slugTouched.value = true
}

function validate(): Record<string, string> {
  const errors: Record<string, string> = {}
  const title = form.title.trim()
  const excerpt = form.excerpt.trim()
  const content = form.contentMarkdown.trim()

  if (title.length < 3 || title.length > 120) {
    errors.title = 'El título debe tener entre 3 y 120 caracteres.'
  }
  if (excerpt.length < 40 || excerpt.length > 200) {
    errors.excerpt = 'El resumen debe tener entre 40 y 200 caracteres.'
  }
  if (content.length < 50 || content.length > 20_000) {
    errors.contentMarkdown = 'El contenido debe tener entre 50 y 20,000 caracteres.'
  }
  if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    errors.slug = 'El slug solo puede usar minúsculas, números y guiones.'
  }

  return errors
}

async function save(nextStatus: BlogStatus) {
  fields.value = validate()
  actionError.value = ''
  if (Object.keys(fields.value).length > 0) return

  saving.value = true
  savingStatus.value = nextStatus

  try {
    const input = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      contentMarkdown: form.contentMarkdown.trim(),
      coverImage: form.coverImage,
      status: nextStatus
    }
    const result = props.post
      ? await updatePost(props.post.id, input)
      : await createPost(input)

    status.value = result.post.status
    emit('saved', result)
  } catch (caught) {
    if (caught instanceof AdminBlogApiError) {
      fields.value = caught.fields ?? {}
      actionError.value = caught.message
      if (caught.status === 401) emit('unauthorized')
    } else {
      actionError.value = 'No pudimos guardar el artículo. Inténtalo de nuevo.'
    }
  } finally {
    saving.value = false
    savingStatus.value = null
  }
}

async function remove() {
  if (!props.post) return
  if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este artículo?')) return

  deleting.value = true
  actionError.value = ''

  try {
    const result = await deletePost(props.post.id)
    emit('deleted', props.post, result)
  } catch (caught) {
    if (caught instanceof AdminBlogApiError) {
      actionError.value = caught.message
      if (caught.status === 401) emit('unauthorized')
    } else {
      actionError.value = 'No pudimos eliminar el artículo. Inténtalo de nuevo.'
    }
  } finally {
    deleting.value = false
  }
}

function chooseCover() {
  coverInput.value?.click()
}

async function handleCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploadingCover.value = true
  coverError.value = ''

  try {
    const result = await uploadImage(file)
    form.coverImage = result.url
  } catch (caught) {
    coverError.value =
      caught instanceof AdminBlogApiError ? caught.message : 'No pudimos subir la portada.'
    if (caught instanceof AdminBlogApiError && caught.status === 401) emit('unauthorized')
  } finally {
    uploadingCover.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-12 md:px-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">
          {{ isNew ? 'Nuevo artículo' : 'Editar artículo' }}
        </h1>
      </div>
      <span
        class="rounded-full border border-border px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.16em]"
        :class="status === 'published' ? 'text-accent' : 'text-text-muted'"
      >
        {{ status === 'published' ? 'Publicado' : 'Borrador' }}
      </span>
    </div>

    <form class="mt-8 space-y-6" @submit.prevent>
      <div class="grid gap-6 lg:grid-cols-2">
        <BaseInput
          :model-value="form.title"
          label="Título"
          required
          :error="fields.title"
          @update:model-value="updateTitle"
        />
        <BaseInput
          :model-value="form.slug"
          label="Slug"
          :error="fields.slug"
          @update:model-value="updateSlug"
        />
      </div>
      <p class="-mt-3 font-body text-xs text-text-muted">
        URL del artículo: /blog/{{ form.slug || 'se-genera-al-guardar' }}
      </p>

      <BaseTextarea
        v-model="form.excerpt"
        label="Resumen"
        :rows="3"
        required
        :error="fields.excerpt"
      />

      <div class="space-y-2">
        <p class="font-body text-sm font-medium text-text">Portada (opcional)</p>
        <div v-if="form.coverImage" class="space-y-3">
          <img
            :src="form.coverImage"
            alt="Vista previa de la portada"
            class="aspect-[16/9] w-full max-w-md rounded-xl object-cover"
          />
          <BaseButton
            type="button"
            variant="secondary"
            size="sm"
            @click="form.coverImage = null"
          >
            Quitar portada
          </BaseButton>
        </div>
        <div v-else class="flex flex-wrap items-center gap-3">
          <BaseButton
            type="button"
            variant="secondary"
            size="sm"
            :loading="uploadingCover"
            @click="chooseCover"
          >
            Subir portada
          </BaseButton>
          <span class="font-body text-xs text-text-muted">JPG, PNG, WebP o GIF · máx. 5 MB</span>
        </div>
        <input
          ref="coverInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="sr-only"
          @change="handleCover"
        />
        <p v-if="coverError" class="font-body text-sm text-red-500" role="alert">
          {{ coverError }}
        </p>
      </div>

      <MarkdownEditor v-model="form.contentMarkdown" :error="fields.contentMarkdown" />

      <div
        v-if="actionError"
        class="rounded-xl border border-red-500/40 bg-red-500/10 p-4"
        role="alert"
      >
        <p class="font-body text-sm text-red-500">{{ actionError }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <BaseButton
          type="button"
          :loading="savingStatus === 'published'"
          :disabled="saving || deleting"
          @click="save('published')"
        >
          {{ status === 'published' ? 'Guardar cambios' : 'Publicar' }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="secondary"
          :loading="savingStatus === 'draft'"
          :disabled="saving || deleting"
          @click="save('draft')"
        >
          {{ status === 'published' ? 'Despublicar' : 'Guardar borrador' }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          :disabled="saving || deleting"
          @click="emit('cancel')"
        >
          Cancelar
        </BaseButton>
        <button
          v-if="!isNew"
          type="button"
          class="ml-auto min-h-11 rounded-md px-4 font-body text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          :disabled="saving || deleting"
          @click="remove"
        >
          {{ deleting ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </form>
  </section>
</template>
