<script setup lang="ts">
import { services } from '../../content/services'
import BaseButton from '../ui/BaseButton.vue'
import BaseCard from '../ui/BaseCard.vue'
import BrandOrnament from '../ui/BrandOrnament.vue'
import SectionHeading from '../ui/SectionHeading.vue'
import { serviceOrnament } from './serviceOrnament'
</script>

<template>
  <section class="border-y border-border bg-surface py-16">
    <div class="mx-auto max-w-7xl px-4 md:px-8">
      <SectionHeading
        eyebrow="Servicios"
        title="Un camino para cada proceso"
        subtitle="Cada sesión se adapta a tu historia y a lo que necesitas transformar."
      />

      <div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <RouterLink
          v-for="service in services"
          :key="service.id"
          :to="`/servicios#${service.id}`"
          class="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <BaseCard interactive class="flex h-full flex-col p-6">
            <BrandOrnament :name="serviceOrnament(service.icon)" class="h-25 w-25 m-auto" />
            <h3 class="mt-4 font-display text-xl font-semibold text-text">{{ service.name }}</h3>
            <span
              class="mt-5 font-body text-xs font-semibold uppercase tracking-[0.12em] text-accent group-hover:underline"
            >
              Ver detalle →
            </span>
          </BaseCard>
        </RouterLink>
      </div>

      <div class="mt-10 flex justify-center">
        <RouterLink v-slot="{ href, navigate }" to="/contacto" custom>
          <BaseButton as="a" :href="href" size="lg" @click="navigate">AGENDAR CITA</BaseButton>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
