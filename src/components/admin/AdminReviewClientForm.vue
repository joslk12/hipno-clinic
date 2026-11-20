<script setup lang="ts">
import { ref } from 'vue'
import type { ReviewClient, ReviewClientInput } from '../../types/review-invitations'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'

const props = defineProps<{ client: ReviewClient | null }>()

const emit = defineEmits<{
  save: [input: ReviewClientInput]
  cancel: []
}>()

const name = ref(props.client?.name ?? '')
const email = ref(props.client?.email ?? '')
const whatsapp = ref(props.client?.whatsapp ?? '')

function submit() {
  emit('save', {
    name: name.value.trim(),
    email: email.value.trim(),
    whatsapp: whatsapp.value.trim()
  })
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-border bg-surface p-6" @submit.prevent="submit">
    <h2 class="font-display text-xl font-semibold text-accent">
      {{ client ? 'Editar cliente' : 'Nuevo cliente' }}
    </h2>
    <p class="font-body text-sm text-text-muted">
      Registra al menos un medio de contacto. Los datos no se muestran en el sitio público.
    </p>

    <BaseInput v-model="name" label="Nombre" autocomplete="name" required />
    <BaseInput v-model="email" label="Correo electrónico" type="email" autocomplete="email" optional />
    <BaseInput
      v-model="whatsapp"
      label="WhatsApp (con código de país)"
      type="tel"
      autocomplete="tel"
      optional
    />

    <div class="flex flex-wrap gap-2">
      <BaseButton type="submit">Guardar cliente</BaseButton>
      <BaseButton type="button" variant="secondary" @click="emit('cancel')">Cancelar</BaseButton>
    </div>
  </form>
</template>
