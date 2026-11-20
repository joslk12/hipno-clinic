<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { usePageMeta } from '../composables/usePageMeta'
import HeroSection from '../components/sections/HeroSection.vue'
import ServicesSummary from '../components/sections/ServicesSummary.vue'
import SpecialistPreview from '../components/sections/SpecialistPreview.vue'
usePageMeta(pageMeta.home)
</script>

<template>
  <HeroSection />
  <SpecialistPreview />
  <ServicesSummary />
</template>
