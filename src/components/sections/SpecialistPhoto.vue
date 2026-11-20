<script setup lang="ts">
import portraitPng from '../../assets/brand/photos/maricela-portrait-framed.png'

withDefaults(
  defineProps<{
    alt?: string
    loading?: 'lazy' | 'eager'
  }>(),
  {
    alt: 'Retrato de Maricela Aguilar Enríquez, especialista en hipnosis regresiva y regenerativa',
    loading: 'lazy'
  }
)
</script>

<template>
  <img
    :src="portraitPng"
    width="224"
    height="248"
    :alt="alt"
    :loading="loading"
    decoding="async"
    class="block h-auto w-full"
  />
</template>
