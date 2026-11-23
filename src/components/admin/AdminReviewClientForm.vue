<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReviewClient, ReviewClientInput } from '../../types/review-invitations'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  detectPhoneCountry,
  getPhoneCountry,
  joinPhone,
  nationalPhone
} from '../../utils/phoneCountries'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'

const props = defineProps<{ client: ReviewClient | null }>()

const emit = defineEmits<{
  save: [input: ReviewClientInput]
  cancel: []
}>()

const name = ref(props.client?.name ?? '')
const email = ref(props.client?.email ?? '')
const countryCode = ref(DEFAULT_PHONE_COUNTRY.code)
const localNumber = ref('')

function loadClient(client: ReviewClient | null) {
  name.value = client?.name ?? ''
  email.value = client?.email ?? ''

  const stored = client?.whatsapp ?? ''
  const country = stored ? detectPhoneCountry(stored) : DEFAULT_PHONE_COUNTRY
  countryCode.value = country.code
  localNumber.value = stored ? nationalPhone(stored, country) : ''
}

loadClient(props.client)
watch(() => props.client, loadClient)

const selectedCountry = computed(() => getPhoneCountry(countryCode.value))

const phoneNumber = computed({
  get: () => localNumber.value,
  set: (value: string) => {
    const trimmed = value.trim()
    // Si pegan un número completo con + o 00, detectamos el país automáticamente.
    if (/^\+/.test(trimmed) || /^00\d/.test(trimmed)) {
      const country = detectPhoneCountry(trimmed)
      countryCode.value = country.code
      localNumber.value = nationalPhone(trimmed, country)
      return
    }
    localNumber.value = value
  }
})

function submit() {
  emit('save', {
    name: name.value.trim(),
    email: email.value.trim(),
    whatsapp: joinPhone(selectedCountry.value.dial, localNumber.value)
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

    <div class="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <div class="space-y-2">
        <label for="whatsapp-country" class="block font-body text-sm font-medium text-text">
          País / código
        </label>
        <select
          id="whatsapp-country"
          v-model="countryCode"
          class="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option v-for="country in PHONE_COUNTRIES" :key="country.code" :value="country.code">
            {{ country.flag }} {{ country.name }} (+{{ country.dial }})
          </option>
        </select>
      </div>

      <BaseInput
        v-model="phoneNumber"
        label="Número de WhatsApp"
        type="tel"
        autocomplete="tel-national"
        optional
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseButton type="submit">Guardar cliente</BaseButton>
      <BaseButton type="button" variant="secondary" @click="emit('cancel')">Cancelar</BaseButton>
    </div>
  </form>
</template>
