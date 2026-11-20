<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { usePageMeta } from '../composables/usePageMeta'
import SpecialistProfile from '../components/sections/SpecialistProfile.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'
usePageMeta(pageMeta.about)
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 pt-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Sobre Mí"
      title="Un espacio para comprenderte y transformarte"
      subtitle="Un acompañamiento respetuoso, confidencial y profundo para volver a tu centro."
    />
    <br/>
  </section>

  <SpecialistProfile />
</template>
