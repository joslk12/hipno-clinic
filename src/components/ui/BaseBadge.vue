<script setup lang="ts">
import { computed } from 'vue'

type BadgeTone = 'gold' | 'neutral'

const props = withDefaults(
  defineProps<{
    tone?: BadgeTone
  }>(),
  {
    tone: 'gold'
  }
)

const classes = computed(() => [
  'inline-flex items-center gap-1 rounded-full px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.08em]',
  props.tone === 'gold'
    ? 'bg-accent-satin text-charcoal'
    : 'border border-border bg-surface-alt text-text'
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
