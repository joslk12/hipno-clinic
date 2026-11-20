<script setup lang="ts">
import { computed } from 'vue'
import type { InvitationStatus, ReviewClient, ReviewInvitationView } from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'

const props = defineProps<{
  clients: ReviewClient[]
  invitations: ReviewInvitationView[]
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  create: []
  edit: [client: ReviewClient]
  delete: [client: ReviewClient]
  select: [client: ReviewClient]
}>()

const statusByClient = computed(() => {
  const map = new Map<string, ReviewInvitationView>()
  for (const invitation of props.invitations) {
    if (!map.has(invitation.clientId)) map.set(invitation.clientId, invitation)
  }
  return map
})

function label(status: InvitationStatus | undefined): string {
  if (!status) return 'Sin invitación'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Administración
        </p>
        <h1 class="mt-1 font-display text-3xl font-semibold text-accent">Reseñas por invitación</h1>
      </div>
      <BaseButton size="sm" @click="emit('create')">Nuevo cliente</BaseButton>
    </div>

    <p v-if="loading" class="font-body text-sm text-text-muted" role="status" aria-live="polite">
      Cargando clientes…
    </p>
    <p v-else-if="error" class="font-body text-sm text-red-500" role="alert">{{ error }}</p>
    <p v-else-if="clients.length === 0" class="font-body text-sm text-text-muted">
      Aún no hay clientes registrados.
    </p>

    <div v-else class="overflow-x-auto rounded-xl border border-border">
      <table class="w-full min-w-[720px] text-left font-body text-sm">
        <thead class="bg-surface text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th class="px-4 py-3">Cliente</th>
            <th class="px-4 py-3">Correo</th>
            <th class="px-4 py-3">WhatsApp</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Último envío</th>
            <th class="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in clients" :key="client.id" class="border-t border-border">
            <td class="px-4 py-3 text-text">{{ client.name }}</td>
            <td class="px-4 py-3 text-text-muted">{{ client.email || '—' }}</td>
            <td class="px-4 py-3 text-text-muted">{{ client.whatsapp || '—' }}</td>
            <td class="px-4 py-3 text-text-muted">
              {{ label(statusByClient.get(client.id)?.status) }}
            </td>
            <td class="px-4 py-3 text-text-muted">
              {{ statusByClient.get(client.id)?.lastSentAt ?? '—' }}
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <BaseButton size="sm" variant="secondary" @click="emit('select', client)">
                  Elegir
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="emit('edit', client)">
                  Editar
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="emit('delete', client)">
                  Eliminar
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
