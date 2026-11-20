<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ReviewForm from '../components/sections/ReviewForm.vue'
import ReviewList from '../components/sections/ReviewList.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'
import StarRating from '../components/ui/StarRating.vue'
import { pageMeta } from '../content/pages'
import { formatReviewAverage } from '../content/reviews'
import { usePageMeta } from '../composables/usePageMeta'
import { checkInvitation, listReviews, ReviewsApiError } from '../services/reviews'
import type { PublicReview, ReviewSummary } from '../types/reviews'

usePageMeta(pageMeta.reviews)

type InvitationState = 'checking' | 'valid' | 'invalid' | 'error'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const invitation = ref<InvitationState>(token ? 'checking' : 'invalid')

const reviews = ref<PublicReview[]>([])
const summary = ref<ReviewSummary>({ average: 0, count: 0 })
const status = ref<'loading' | 'idle' | 'error'>('loading')
const error = ref('')

const averageLabel = computed(() => formatReviewAverage(summary.value.average))
const hasReviews = computed(() => summary.value.count > 0)

async function loadReviews() {
  status.value = 'loading'
  error.value = ''

  try {
    const data = await listReviews()
    reviews.value = data.reviews
    summary.value = data.summary
    status.value = 'idle'
  } catch (caught) {
    status.value = 'error'
    error.value =
      caught instanceof ReviewsApiError
        ? caught.message
        : 'No pudimos cargar las reseñas. Inténtalo de nuevo.'
  }
}

async function checkToken() {
  if (!token) {
    invitation.value = 'invalid'
    return
  }

  invitation.value = 'checking'

  try {
    const result = await checkInvitation(token)
    invitation.value = result.valid ? 'valid' : 'invalid'
  } catch {
    invitation.value = 'error'
  }
}

onMounted(() => {
  void loadReviews()
  void checkToken()
})
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Reseñas"
      title="Lo que dicen nuestros clientes"
      subtitle="Conoce cómo la hipnosis ha acompañado a otras personas en su proceso. Las reseñas se escriben solo con una invitación privada."
    />

    <div class="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <BaseCard class="p-6 md:p-8">
        <template v-if="invitation === 'valid'">
          <h2 class="font-display text-2xl font-semibold text-accent">Comparte tu experiencia</h2>
          <p class="mt-2 font-body text-sm text-text-muted">
            Tu opinión ayuda a otras personas a dar el primer paso. Las reseñas se publican después de
            una revisión automática.
          </p>
          <div class="mt-6">
            <ReviewForm :token="token" @created="loadReviews" />
          </div>
        </template>

        <template v-else-if="invitation === 'invalid'">
          <h2 class="font-display text-2xl font-semibold text-accent">Reseñas por invitación</h2>
          <p class="mt-2 font-body text-sm leading-relaxed text-text-muted">
            Publicamos las experiencias de las personas que han trabajado con nosotras. Si recibiste
            una liga privada, ábrela desde el correo o el mensaje que te enviamos para compartir tu
            experiencia.
          </p>
          <p v-if="token" class="mt-4 font-body text-sm text-text-muted" role="status">
            Esta liga ya no es válida. Si la necesitas, pide una nueva invitación.
          </p>
        </template>

        <template v-else>
          <h2 class="font-display text-2xl font-semibold text-accent">Un momento…</h2>
          <p class="mt-2 font-body text-sm text-text-muted" role="status" aria-live="polite">
            {{
              invitation === 'error'
                ? 'No pudimos validar la invitación. Recarga la página para intentarlo de nuevo.'
                : 'Estamos validando tu invitación.'
            }}
          </p>
        </template>
      </BaseCard>

      <div class="space-y-6">
        <BaseCard v-if="hasReviews" class="p-6">
          <div class="flex flex-wrap items-center gap-4">
            <p class="font-display text-4xl font-semibold text-accent">
              {{ averageLabel }}
            </p>
            <div>
              <StarRating :rating="summary.average" />
              <p class="mt-1 font-body text-sm text-text-muted">
                {{ summary.count }}
                {{ summary.count === 1 ? 'reseña publicada' : 'reseñas publicadas' }}
              </p>
            </div>
          </div>
        </BaseCard>

        <ReviewList
          :reviews="reviews"
          :status="status"
          :error="error"
          @retry="loadReviews"
        />
      </div>
    </div>
  </section>
</template>
