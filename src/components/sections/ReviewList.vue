<script setup lang="ts">
import { formatReviewDate } from '../../content/reviews'
import type { PublicReview } from '../../types/reviews'
import BaseButton from '../ui/BaseButton.vue'
import StarRating from '../ui/StarRating.vue'

type ListStatus = 'loading' | 'idle' | 'error'

withDefaults(
  defineProps<{
    reviews: PublicReview[]
    status?: ListStatus
    error?: string
  }>(),
  {
    status: 'idle',
    error: undefined
  }
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div>
    <h2 class="font-display text-2xl font-semibold text-accent">Opiniones de clientas</h2>

    <div
      v-if="status === 'loading'"
      class="mt-6 flex items-center gap-3 font-body text-sm text-text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      Cargando reseñas…
    </div>

    <div
      v-else-if="status === 'error'"
      class="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-5"
      role="alert"
    >
      <p class="font-body text-sm text-red-500">
        {{ error ?? 'No pudimos cargar las reseñas.' }}
      </p>
      <BaseButton class="mt-4" variant="secondary" size="sm" @click="emit('retry')">
        Reintentar
      </BaseButton>
    </div>

    <div
      v-else-if="reviews.length === 0"
      class="mt-6 rounded-xl border border-border bg-surface-alt p-5"
    >
      <p class="font-body text-base font-medium text-text">Aún no hay reseñas publicadas.</p>
      <p class="mt-1 font-body text-sm text-text-muted">
        Sé la primera persona en compartir su experiencia.
      </p>
    </div>

    <ul v-else class="mt-6 space-y-4">
      <li v-for="review in reviews" :key="review.id">
        <article class="rounded-xl border border-border bg-surface p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-body font-semibold text-text">{{ review.name }}</p>
            <StarRating :rating="review.rating" size="sm" />
          </div>
          <time :datetime="review.createdAt" class="mt-1 block font-body text-xs text-text-muted">
            {{ formatReviewDate(review.createdAt) }}
          </time>
          <p class="mt-3 whitespace-pre-line break-words font-body text-sm leading-relaxed text-text">
            {{ review.message }}
          </p>
        </article>
      </li>
    </ul>
  </div>
</template>
