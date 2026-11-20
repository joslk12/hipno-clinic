<script setup lang="ts">
import { computed } from 'vue'

type StarSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    rating: number
    max?: number
    size?: StarSize
  }>(),
  {
    max: 5,
    size: 'md'
  }
)

const roundedRating = computed(() => Math.round(props.rating))
const stars = computed(() =>
  Array.from({ length: props.max }, (_, index) => index < roundedRating.value)
)

const sizeClasses: Record<StarSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl'
}

const label = computed(() => `${roundedRating.value} de ${props.max} estrellas`)
</script>

<template>
  <span
    class="inline-flex items-center gap-0.5 align-middle"
    role="img"
    :aria-label="label"
  >
    <span
      v-for="(filled, index) in stars"
      :key="index"
      aria-hidden="true"
      :class="[sizeClasses[props.size], filled ? 'text-accent-satin' : 'text-border']"
    >
      ★
    </span>
  </span>
</template>
