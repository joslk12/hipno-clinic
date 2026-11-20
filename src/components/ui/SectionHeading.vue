<script setup lang="ts">
import { computed } from 'vue'

type HeadingLevel = 'h1' | 'h2' | 'h3'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    subtitle?: string
    as?: HeadingLevel
  }>(),
  {
    eyebrow: undefined,
    subtitle: undefined,
    as: 'h2'
  }
)

const classes = computed(() => [
  'break-words font-display font-semibold tracking-[0.08em] text-accent',
  props.as === 'h1'
    ? 'text-4xl md:text-5xl'
    : props.as === 'h2'
      ? 'text-3xl md:text-4xl'
      : 'text-2xl md:text-3xl'
])
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="eyebrow"
      class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent"
    >
      {{ eyebrow }}
    </p>
    <component :is="as" :class="classes">
      {{ title }}
    </component>
    <p v-if="subtitle" class="max-w-2xl font-body text-base leading-relaxed text-text-muted">
      {{ subtitle }}
    </p>
  </div>
</template>
