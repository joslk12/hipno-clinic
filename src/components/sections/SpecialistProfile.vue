<script setup lang="ts">
import { profile } from '../../content/profile'
import BaseButton from '../ui/BaseButton.vue'
import BrandOrnament from '../ui/BrandOrnament.vue'
import PillarCard from './PillarCard.vue'
import SpecialistPhoto from './SpecialistPhoto.vue'
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 pb-16 md:px-8">
    <div class="grid gap-10 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
      <div class="mx-auto w-full max-w-[260px]">
        <div class="relative border-2 border-accent-satin p-2">
          <SpecialistPhoto />
          <BrandOrnament
            name="corner-1"
            class="absolute -left-0 -top-0 h-10 w-10 p-1"
          />
          <BrandOrnament
            name="corner-4"
            class="absolute -bottom-0 -right-0 h-10 w-10 p-1"
          />
        </div>
      </div>

      <div>
        <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Trayectoria y filosofía
        </p>
        <h2 class="mt-3 font-display text-3xl font-semibold tracking-[0.08em] text-accent md:text-4xl">
          {{ profile.name }}
        </h2>
        <p class="mt-2 font-body text-sm font-medium uppercase tracking-[0.12em] text-text-muted">
          {{ profile.role }}
        </p>

        <div class="mt-6 space-y-4 font-body text-base leading-relaxed text-text-muted">
          <p>{{ profile.history }}</p>
          <p class="border-l-2 border-accent-satin pl-4 font-accent text-xl italic text-accent">
            {{ profile.philosophy }}
          </p>
        </div>

        <div class="mt-10">
          <h3 class="font-display text-2xl font-semibold text-accent">Pilares del acompañamiento</h3>
          <div class="mt-4 grid gap-4 sm:grid-cols-3">
            <PillarCard
              v-for="(pillar, index) in profile.pillars"
              :key="pillar.title"
              :title="pillar.title"
              :description="pillar.description"
              :index="index + 1"
            />
          </div>
        </div>

        <div class="mt-8">
          <RouterLink v-slot="{ href, navigate }" to="/contacto" custom>
            <BaseButton as="a" :href="href" size="lg" @click="navigate">AGENDAR CITA</BaseButton>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
