<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    interactive?: boolean
    as?: string
  }>(),
  {
    interactive: false,
    as: 'div'
  }
)

const classes = computed(() => [
  'rounded-2xl border border-border bg-surface text-text transition-all duration-200',
  props.interactive
    ? 'hover:-translate-y-0.5 hover:border-accent hover:shadow-gold focus-within:border-accent focus-within:shadow-gold'
    : ''
])
</script>

<template>
  <component :is="as" v-bind="$attrs" :class="classes">
    <slot />
  </component>
</template>
