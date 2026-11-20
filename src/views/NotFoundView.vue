<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { usePageMeta } from '../composables/usePageMeta'
import BaseButton from '../components/ui/BaseButton.vue'
import BrandOrnament from '../components/ui/BrandOrnament.vue'
usePageMeta(pageMeta.notFound)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
    <p class="font-display text-7xl font-semibold tracking-[0.12em] text-accent md:text-8xl">
      404
    </p>
    <BrandOrnament name="divider-3" class="mx-auto mt-4 h-8 w-32" />
    <h1 class="mt-6 font-display text-4xl font-semibold text-accent md:text-5xl">
      Página no encontrada
    </h1>
    <p class="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-text-muted">
      La página que buscas no existe o cambió de ubicación.
    </p>
    <div class="mt-8">
      <RouterLink v-slot="{ href, navigate }" to="/" custom>
        <BaseButton as="a" :href="href" @click="navigate">Volver al inicio</BaseButton>
      </RouterLink>
    </div>
  </section>
</template>
