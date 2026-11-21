<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import AdminNav from '@/components/admin/AdminNav.vue' 
import AdminReviewClientForm from '../../components/admin/AdminReviewClientForm.vue'
import AdminReviewClientList from '../../components/admin/AdminReviewClientList.vue'
import AdminReviewInvitationActions from '../../components/admin/AdminReviewInvitationActions.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import { usePageMeta } from '../../composables/usePageMeta'
import { AdminBlogApiError, getSession, logout } from '../../services/adminBlog'
import {
  AdminReviewApiError,
  createClient,
  deleteClient,
  listClients,
  listInvitations,
  sendInvitation,
  updateClient
} from '../../services/adminReviewInvitations'
import type {
  InvitationChannel,
  ReviewClient,
  ReviewClientInput,
  ReviewInvitationView,
  SendInvitationResult
} from '../../types/review-invitations'

usePageMeta({
  title: 'Administración de reseñas | Origen Consciente',
  description: 'Área privada para invitar a clientes a dejar reseñas.',
  path: '/admin/resenas',
  robots: 'noindex, nofollow'
})

const checking = ref(true)
const authenticated = ref(false)
const clients = ref<ReviewClient[]>([])
const invitations = ref<ReviewInvitationView[]>([])
const channels = ref({ email: false, whatsapp: false })
const loading = ref(false)
const listError = ref('')
const editing = ref<ReviewClient | null | undefined>(undefined)
const selected = ref<ReviewClient | null>(null)
const sending = ref('')
const notice = ref('')
const actionError = ref('')
const lastResult = ref<SendInvitationResult | null>(null)
const copied = ref(false)
const whatsappMessage = computed(() => lastResult.value?.whatsapp ?? null)

function resetSession() {
  authenticated.value = false
  clients.value = []
  invitations.value = []
  editing.value = undefined
  selected.value = null
  notice.value = ''
}

function handleApiError(caught: unknown, fallback: string) {
  if (caught instanceof AdminReviewApiError) {
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

async function loadData() {
  loading.value = true
  listError.value = ''

  try {
    const [clientData, invitationData] = await Promise.all([listClients(), listInvitations()])
    clients.value = clientData.clients
    invitations.value = invitationData.invitations
    channels.value = invitationData.channels
    if (selected.value) {
      selected.value = clients.value.find((item) => item.id === selected.value?.id) ?? null
    }
  } catch (caught) {
    handleApiError(caught, 'No pudimos cargar los clientes.')
    listError.value = actionError.value
  } finally {
    loading.value = false
  }
}

async function checkSession() {
  checking.value = true

  try {
    await getSession()
    authenticated.value = true
    await loadData()
  } catch (caught) {
    if (
      caught instanceof AdminBlogApiError ||
      (caught instanceof AdminReviewApiError && caught.status === 401)
    ) {
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
  void loadData()
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    resetSession()
  }
}

function handleEdit(client: ReviewClient) {
  actionError.value = ''
  notice.value = ''
  editing.value = client
}

async function handleSaved(input: ReviewClientInput) {
  actionError.value = ''

  try {
    const editingClient = editing.value
    const result = editingClient
      ? await updateClient(editingClient.id, input)
      : await createClient(input)
    editing.value = undefined
    selected.value = result.client
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos guardar el cliente.')
  }
}

async function handleDelete(client: ReviewClient) {
  if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar a ${client.name}?`)) return

  actionError.value = ''

  try {
    const result = await deleteClient(client.id)
    if (selected.value?.id === client.id) selected.value = null
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos eliminar el cliente.')
  }
}

async function handleSend(selectedChannels: InvitationChannel[]) {
  if (!selected.value) return

  sending.value = selected.value.id
  actionError.value = ''
  lastResult.value = null
  copied.value = false

  try {
    const invitationId = invitations.value.find((item) => item.clientId === selected.value?.id)?.id
    const result = await sendInvitation({
      clientId: selected.value.id,
      channels: selectedChannels,
      ...(invitationId ? { invitationId } : {})
    })
    lastResult.value = result
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos enviar la liga.')
  } finally {
    sending.value = ''
  }
}

async function handlePrepareWhatsapp() {
  if (!selected.value) return

  sending.value = selected.value.id
  actionError.value = ''
  lastResult.value = null
  copied.value = false

  try {
    const invitationId = invitations.value.find((item) => item.clientId === selected.value?.id)?.id
    const result = await sendInvitation({
      clientId: selected.value.id,
      channels: [],
      generateWhatsapp: true,
      ...(invitationId ? { invitationId } : {})
    })
    lastResult.value = result
    notice.value = result.message
    await loadData()
  } catch (caught) {
    handleApiError(caught, 'No pudimos generar la liga de WhatsApp.')
  } finally {
    sending.value = ''
  }
}

async function copyMessage(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand?.('copy')
      document.body.removeChild(area)
    }
    copied.value = true
  } catch {
    copied.value = false
  }
}

function statusFor(clientId: string) {
  return invitations.value.find((item) => item.clientId === clientId) ?? null
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

    <div v-if="actionError" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert">
        <p class="font-body text-sm text-red-500">{{ actionError }}</p>
      </div>
    </div>

    <AdminNav v-if="authenticated" active="resenas" @logout="handleLogout"/>

    <div
      v-if="checking"
      class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center gap-3 px-4 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      Verificando sesión…
    </div>

    <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

    <div v-else class="mx-auto max-w-6xl space-y-6 px-4 py-12 md:px-8">
      <AdminReviewClientForm
        v-if="editing !== undefined"
        :client="editing"
        @save="handleSaved"
        @cancel="editing = undefined"
      />

      <AdminReviewClientList
        :clients="clients"
        :invitations="invitations"
        :loading="loading"
        :error="listError"
        @create="editing = null"
        @edit="handleEdit"
        @delete="handleDelete"
        @select="selected = $event"
      />

      <AdminReviewInvitationActions
        v-if="selected"
        :client="selected"
        :invitation="statusFor(selected.id)"
        :email-configured="channels.email"
        :whatsapp-configured="channels.whatsapp"
        :sending="sending === selected.id"
        @send="handleSend"
        @prepare-whatsapp="handlePrepareWhatsapp"
      />

      <div v-if="lastResult" class="rounded-xl border border-border bg-surface p-6">
        <h2 class="font-display text-lg font-semibold text-accent">Resultado del envío</h2>
        <ul class="mt-3 space-y-1 font-body text-sm text-text-muted">
          <li v-for="result in lastResult.results" :key="result.channel">
            {{ result.channel }}: {{ result.ok ? 'enviado' : (result.error ?? 'error') }}
          </li>
        </ul>
        <p class="mt-3 break-all font-body text-sm text-text">
          <a :href="lastResult.link" class="underline">{{ lastResult.link }}</a>
        </p>

        <div v-if="whatsappMessage" class="mt-4 space-y-3 border-t border-border pt-4">
          <p class="font-body text-sm font-semibold text-text">Mensaje para WhatsApp</p>
          <textarea
            :value="whatsappMessage.text"
            readonly
            rows="3"
            aria-label="Mensaje para WhatsApp"
            class="w-full rounded-md border border-border bg-bg p-3 font-body text-sm text-text"
          />
          <div class="flex flex-wrap gap-3">
            <BaseButton type="button" variant="secondary" @click="copyMessage(whatsappMessage.text)">
              {{ copied ? 'MENSAJE COPIADO' : 'COPIAR MENSAJE' }}
            </BaseButton>
            <BaseButton
              as="a"
              variant="ghost"
              :href="whatsappMessage.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              ABRIR WHATSAPP
            </BaseButton>
          </div>
          <p
            v-if="copied"
            class="font-body text-xs text-text-muted"
            role="status"
            aria-live="polite"
          >
            Mensaje copiado. Pégalo en el chat de tu clienta y envíalo desde tu WhatsApp.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
