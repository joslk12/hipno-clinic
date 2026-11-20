<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import BrandIcon from './BrandIcon.vue'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="isDark ? 'true' : 'false'"
    :aria-label="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border text-accent transition-colors hover:border-accent"
    @click="toggleTheme"
  >
    <BrandIcon v-if="isDark" name="sun" decorative class="h-5 w-5" />
    <BrandIcon v-else name="moon" decorative class="h-5 w-5" />
  </button>
</template>
