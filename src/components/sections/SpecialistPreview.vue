<script setup lang="ts">
import { profile } from '../../content/profile'
import BaseButton from '../ui/BaseButton.vue'
import SectionHeading from '../ui/SectionHeading.vue'
import SpecialistPhoto from './SpecialistPhoto.vue'
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <div class="grid items-center gap-10 md:grid-cols-[minmax(0,260px)_1fr]">
      <div class="mx-auto w-full max-w-[240px] border-2 border-accent-satin p-2">
        <SpecialistPhoto />
      </div>

      <div>
        <SectionHeading
          eyebrow="La especialista"
          :title="profile.name"
          :subtitle="profile.role"
        />
        <p class="mt-6 max-w-2xl font-body text-base leading-relaxed text-text-muted">
          {{ profile.summary }}
        </p>
        <div class="mt-8">
          <RouterLink v-slot="{ href, navigate }" to="/sobre-mi" custom>
            <BaseButton as="a" :href="href" variant="secondary" @click="navigate">
              Conocer más
            </BaseButton>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
