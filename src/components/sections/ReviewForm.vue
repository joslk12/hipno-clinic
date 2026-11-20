<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { reviewLimits } from '../../content/reviews'
import { createReview, ReviewsApiError } from '../../services/reviews'
import type { CreateReviewResult } from '../../types/reviews'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import BaseTextarea from '../ui/BaseTextarea.vue'

type FormField = 'name' | 'rating' | 'message' | 'consent'
type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

const emit = defineEmits<{ created: [result: CreateReviewResult] }>()
const props = defineProps<{ token: string }>()

const name = ref('')
const rating = ref<number | null>(null)
const message = ref('')
const consent = ref(false)
const honeypot = ref('')
const errors = ref<Partial<Record<FormField, string>>>({})
const status = ref<FormStatus>('idle')
const feedback = ref('')

const ratingOptions = [1, 2, 3, 4, 5] as const
const fieldOrder: FormField[] = ['name', 'rating', 'message', 'consent']
const fieldIds: Record<FormField, string> = {
  name: 'review-name',
  rating: 'review-rating-1',
  message: 'review-message',
  consent: 'review-consent'
}

function validate() {
  const nextErrors: Partial<Record<FormField, string>> = {}
  const trimmedName = name.value.trim()
  const trimmedMessage = message.value.trim()

  if (trimmedName.length < reviewLimits.nameMin || trimmedName.length > reviewLimits.nameMax) {
    nextErrors.name = `Escribe tu nombre (${reviewLimits.nameMin} a ${reviewLimits.nameMax} caracteres).`
  }

  if (
    !Number.isInteger(rating.value) ||
    (rating.value ?? 0) < reviewLimits.ratingMin ||
    (rating.value ?? 0) > reviewLimits.ratingMax
  ) {
    nextErrors.rating = 'Elige una calificación de 1 a 5 estrellas.'
  }

  if (
    trimmedMessage.length < reviewLimits.messageMin ||
    trimmedMessage.length > reviewLimits.messageMax
  ) {
    nextErrors.message = `Cuéntanos tu experiencia (${reviewLimits.messageMin} a ${reviewLimits.messageMax} caracteres).`
  }

  if (!consent.value) {
    nextErrors.consent = 'Necesitamos tu consentimiento para publicar la reseña.'
  }

  errors.value = nextErrors

  return Object.keys(nextErrors).length === 0
}

async function focusFirstError() {
  await nextTick()

  const firstInvalid = fieldOrder.find((field) => errors.value[field])

  if (firstInvalid) document.getElementById(fieldIds[firstInvalid])?.focus()
}

async function onSubmit() {
  if (!props.token) {
    status.value = 'error'
    feedback.value = 'Esta liga ya no es válida. Solicita una nueva invitación.'
    return
  }

  if (status.value === 'submitting' || honeypot.value.trim()) return

  feedback.value = ''
  status.value = 'idle'

  if (!validate()) {
    await focusFirstError()
    return
  }

  status.value = 'submitting'

  try {
    const result = await createReview({
      name: name.value.trim(),
      rating: rating.value as number,
      message: message.value.trim(),
      consent: consent.value,
      honeypot: honeypot.value,
      invitationToken: props.token
    })

    status.value = 'success'
    feedback.value = result.message
    name.value = ''
    rating.value = null
    message.value = ''
    consent.value = false
    errors.value = {}
    emit('created', result)
  } catch (error) {
    status.value = 'error'

    if (error instanceof ReviewsApiError) {
      if (error.fields) {
        errors.value = error.fields as Partial<Record<FormField, string>>
        await focusFirstError()
      }

      feedback.value = error.message
    } else {
      feedback.value =
        'No pudimos enviar tu reseña. Revisa tu conexión e inténtalo de nuevo.'
    }
  }
}
</script>

<template>
  <form
    novalidate
    class="space-y-5"
    :aria-busy="status === 'submitting' ? 'true' : undefined"
    @submit.prevent="onSubmit"
  >
    <BaseInput
      id="review-name"
      v-model="name"
      label="Tu nombre"
      :error="errors.name"
      autocomplete="name"
      maxlength="60"
      required
    />

    <fieldset
      :aria-invalid="errors.rating ? 'true' : undefined"
      :aria-describedby="errors.rating ? 'review-rating-error' : undefined"
    >
      <legend class="block font-body text-sm font-medium text-text">Tu calificación</legend>
      <div class="mt-2 flex flex-wrap gap-1">
        <label
          v-for="option in ratingOptions"
          :key="option"
          :for="`review-rating-${option}`"
          class="cursor-pointer rounded-md border border-border px-2 py-1 transition-colors hover:border-accent focus-within:border-accent"
        >
          <input
            :id="`review-rating-${option}`"
            v-model.number="rating"
            type="radio"
            name="rating"
            :value="option"
            class="sr-only"
          />
          <span
            aria-hidden="true"
            :class="[
              'text-2xl',
              (rating ?? 0) >= option ? 'text-accent-satin' : 'text-border'
            ]"
          >
            ★
          </span>
          <span class="sr-only">{{ option }} de 5 estrellas</span>
        </label>
      </div>
      <p v-if="errors.rating" id="review-rating-error" class="mt-2 font-body text-sm text-red-500" role="alert">
        {{ errors.rating }}
      </p>
    </fieldset>

    <BaseTextarea
      id="review-message"
      v-model="message"
      label="Tu reseña"
      :error="errors.message"
      :rows="5"
      maxlength="1000"
      required
    />

    <div class="space-y-2">
      <label for="review-consent" class="flex items-start gap-3 font-body text-sm text-text">
        <input
          id="review-consent"
          v-model="consent"
          type="checkbox"
          :aria-invalid="errors.consent ? 'true' : undefined"
          :aria-describedby="errors.consent ? 'review-consent-error' : undefined"
          class="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <span>Acepto que mi reseña se publique en el sitio.</span>
      </label>
      <p v-if="errors.consent" id="review-consent-error" class="font-body text-sm text-red-500" role="alert">
        {{ errors.consent }}
      </p>
    </div>

    <div class="hidden" aria-hidden="true">
      <label for="review-website">No completar</label>
      <input
        id="review-website"
        v-model="honeypot"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
      />
    </div>

    <p
      v-if="feedback"
      :role="status === 'error' ? 'alert' : 'status'"
      aria-live="polite"
      :class="[
        'rounded-lg border px-4 py-3 font-body text-sm',
        status === 'error'
          ? 'border-red-500/50 bg-red-500/10 text-red-500'
          : 'border-accent-satin/50 bg-accent-satin/10 text-text'
      ]"
    >
      {{ feedback }}
    </p>

    <BaseButton type="submit" :loading="status === 'submitting'" class="w-full sm:w-auto">
      {{ status === 'submitting' ? 'ENVIANDO…' : 'PUBLICAR RESEÑA' }}
    </BaseButton>
  </form>
</template>
