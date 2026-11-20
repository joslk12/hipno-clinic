<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '../ui/BaseCard.vue'
import BrandOrnament from '../ui/BrandOrnament.vue'

const props = defineProps<{
  title: string
  description: string
  index: number
}>()

const dividers = ['divider-1', 'divider-2', 'divider-3'] as const

const divider = computed(() => dividers[(props.index - 1) % dividers.length])
</script>

<template>
  <BaseCard as="article" class="h-full p-6">
    <div class="flex items-center gap-3">
      <span class="font-display text-2xl font-semibold text-accent">
        {{ String(index).padStart(2, '0') }}
      </span>
      <BrandOrnament :name="divider" class="h-14 w-14 shrink-0" />
    </div>
    <h3 class="mt-4 font-display text-xl font-semibold text-text">{{ title }}</h3>
    <p class="mt-2 font-body text-sm leading-relaxed text-text-muted">{{ description }}</p>
  </BaseCard>
</template>
