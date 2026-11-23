<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type {
  BlogDeleteResult,
  BlogPostMutationResult,
  BlogPostRecord
} from '../../types/blog'
import { AdminBlogApiError, deletePost, getSession, listPosts, logout, rebuildSite } from '../../services/adminBlog'
import { usePageMeta } from '../../composables/usePageMeta'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import AdminNav from '@/components/admin/AdminNav.vue';
import AdminPostEditor from '../../components/admin/AdminPostEditor.vue'
import AdminPostList from '../../components/admin/AdminPostList.vue'

usePageMeta({
  title: 'Administración del blog | Origen Consciente',
  description: 'Área privada para administrar los artículos del blog de Origen Consciente.',
  path: '/admin/blog',
  robots: 'noindex, nofollow'
})

const checking = ref(true)
const authenticated = ref(false)
const posts = ref<BlogPostRecord[]>([])
const loadingPosts = ref(false)
const listError = ref('')
const editing = ref<BlogPostRecord | null | undefined>(undefined)
const notice = ref('')
const actionError = ref('')

function resetSession() {
  authenticated.value = false
  posts.value = []
  editing.value = undefined
  notice.value = ''
}

function handleApiError(caught: unknown, fallback: string) {
  if (caught instanceof AdminBlogApiError) {
    if (caught.status === 401) {
      resetSession()
      actionError.value = 'Tu sesión expiró. Ingresa de nuevo.'
      return
    }
    actionError.value = caught.message
    return
  }

  actionError.value = fallback
}

async function loadPosts() {
  loadingPosts.value = true
  listError.value = ''

  try {
    posts.value = (await listPosts()).posts
  } catch (caught) {
    handleApiError(caught, 'No pudimos cargar los artículos.')
    listError.value = actionError.value
  } finally {
    loadingPosts.value = false
  }
}

async function checkSession() {
  checking.value = true

  try {
    await getSession()
    authenticated.value = true
    await loadPosts()
  } catch (caught) {
    if (caught instanceof AdminBlogApiError && caught.status === 401) {
      authenticated.value = false
    } else {
      handleApiError(caught, 'No pudimos verificar la sesión.')
    }
  } finally {
    checking.value = false
  }
}

function handleAuthenticated() {
  authenticated.value = true
  actionError.value = ''
  void loadPosts()
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    resetSession()
  }
}

function handleSaved(result: BlogPostMutationResult) {
  const index = posts.value.findIndex((post) => post.id === result.post.id)
  if (index === -1) posts.value.unshift(result.post)
  else posts.value[index] = result.post

  editing.value = undefined
  actionError.value = ''
  notice.value = result.build.triggered
    ? 'Artículo guardado. La reconstrucción del sitio está en curso.'
    : result.build.warning
      ? `Artículo guardado. ${result.build.warning}`
      : 'Artículo guardado.'
}

function deleteNotice(result?: BlogDeleteResult): string {
  let message = 'Artículo eliminado.'
  if (result?.build.triggered) {
    message = 'Artículo eliminado. La reconstrucción del sitio está en curso.'
  } else if (result?.build.warning) {
    message = `Artículo eliminado. ${result.build.warning}`
  }

  const images = result?.images
  if (images?.warning) return `${message} ${images.warning}`
  if (images?.deleted) {
    return `${message} Se eliminaron ${images.deleted} ${
      images.deleted === 1 ? 'imagen' : 'imágenes'
    }.`
  }
  return message
}

function handleDeleted(post: BlogPostRecord, result?: BlogDeleteResult) {
  posts.value = posts.value.filter((item) => item.id !== post.id)
  editing.value = undefined
  actionError.value = ''
  notice.value = deleteNotice(result)
}

async function handleDelete(post: BlogPostRecord) {
  if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar “${post.title}”?`)) return

  actionError.value = ''

  try {
    const result = await deletePost(post.id)
    handleDeleted(post, result)
  } catch (caught) {
    handleApiError(caught, 'No pudimos eliminar el artículo.')
  }
}

async function handleRebuild() {
  actionError.value = ''

  try {
    const result = await rebuildSite()
    notice.value = result.triggered
      ? 'Reconstrucción del sitio iniciada.'
      : result.warning ?? 'No fue posible iniciar la reconstrucción.'
  } catch (caught) {
    handleApiError(caught, 'No pudimos iniciar la reconstrucción.')
  }
}

onMounted(checkSession)
</script>

<template>
  <div>
    <div v-if="notice" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div
        class="rounded-xl border border-accent/40 bg-accent-satin/10 p-4"
        role="status"
        aria-live="polite"
      >
        <p class="font-body text-sm text-text">{{ notice }}</p>
      </div>
    </div>

    <div v-if="actionError" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert">
        <p class="font-body text-sm text-red-500">{{ actionError }}</p>
      </div>
    </div>

    <AdminNav v-if="authenticated" active="blog" @logout="handleLogout"/>

    <div
      v-if="checking"
      class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center gap-3 px-4 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      Verificando sesión…
    </div>

    <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

    <AdminPostEditor
      v-else-if="editing !== undefined"
      :post="editing"
      @saved="handleSaved"
      @deleted="handleDeleted"
      @cancel="editing = undefined"
      @unauthorized="resetSession"
    />

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
  </div>
</template>
