<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  InvitationChannel,
  ReviewClient,
  ReviewInvitationView
} from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'

const props = defineProps<{
  client: ReviewClient
  invitation?: ReviewInvitationView | null
  emailConfigured: boolean
  whatsappConfigured: boolean
  sending?: boolean
}>()

const emit = defineEmits<{ send: [channels: InvitationChannel[]] }>()

const channels = ref<InvitationChannel[]>([])

const emailAvailable = computed(() => Boolean(props.client.email) && props.emailConfigured)
const whatsappAvailable = computed(() => Boolean(props.client.whatsapp) && props.whatsappConfigured)

const canSend = computed(() => channels.value.length > 0 && !props.sending)

const needsResend = computed(() => {
  if (!props.invitation) return false
  return props.invitation.status === 'expirada' || props.invitation.status === 'canjeada'
})

watch(
  () => props.client.id,
  () => {
    channels.value = [
      ...(emailAvailable.value ? (['email'] as InvitationChannel[]) : []),
      ...(whatsappAvailable.value ? (['whatsapp'] as InvitationChannel[]) : [])
    ]
  },
  { immediate: true }
)

function toggle(channel: InvitationChannel) {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter((item) => item !== channel)
    : [...channels.value, channel]
}

function submit() {
  if (!canSend.value) return
  emit('send', [...channels.value])
}
</script>

<template>
  <section class="space-y-4 rounded-xl border border-border bg-surface p-6">
    <div>
      <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        Enviar liga
      </p>
      <h2 class="mt-1 font-display text-xl font-semibold text-accent">{{ client.name }}</h2>
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-3 font-body text-sm text-text">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          :checked="channels.includes('email')"
          :disabled="!emailAvailable"
          @change="toggle('email')"
        />
        Correo
        <span v-if="!emailAvailable" class="text-text-muted">
          ({{ client.email ? 'Resend no configurado' : 'sin correo registrado' }})
        </span>
      </label>
      <label class="flex items-center gap-3 font-body text-sm text-text">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          :checked="channels.includes('whatsapp')"
          :disabled="!whatsappAvailable"
          @change="toggle('whatsapp')"
        />
        WhatsApp
        <span v-if="!whatsappAvailable" class="text-text-muted">
          ({{ client.whatsapp ? 'proveedor no configurado' : 'sin número registrado' }})
        </span>
      </label>
    </div>

    <BaseButton :loading="sending" :disabled="!canSend" @click="submit">
      {{ needsResend ? 'REENVIAR (NUEVA LIGA)' : 'ENVIAR LIGA' }}
    </BaseButton>
  </section>
</template>
