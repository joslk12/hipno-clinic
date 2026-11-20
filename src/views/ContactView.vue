<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { usePageMeta } from '../composables/usePageMeta'
import ContactForm from '../components/sections/ContactForm.vue'
import ContactInfo from '../components/sections/ContactInfo.vue'
import LazyMap from '../components/sections/LazyMap.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'
usePageMeta(pageMeta.contact)
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Contacto"
      title="Agenda tu sesión"
      subtitle="Da el primer paso hacia tu bienestar. Escríbenos y te contactaremos para coordinar tu sesión."
    />

    <div class="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <BaseCard class="p-6 md:p-8">
        <h2 class="font-display text-2xl font-semibold text-accent">Cuéntanos sobre ti</h2>
        <div class="mt-6">
          <ContactForm />
        </div>
      </BaseCard>

      <div class="space-y-10">
        <ContactInfo />
        <LazyMap />
      </div>
    </div>
  </section>
</template>
