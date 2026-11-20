<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { usePageMeta } from '../composables/usePageMeta'
import { services } from '../content/services'
import ServiceCard from '../components/sections/ServiceCard.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'
usePageMeta(pageMeta.services)
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Catálogo"
      title="Servicios"
      subtitle="Sesiones de hipnosis regresiva, regenerativa y sanación emocional adaptadas a tu proceso."
    />

    <div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
      <ServiceCard v-for="service in services" :key="service.id" :service="service" />
    </div>
  </section>
</template>
