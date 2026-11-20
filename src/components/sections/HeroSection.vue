<script setup lang="ts">
import { site } from '../../content/site'
import BaseButton from '../ui/BaseButton.vue'
import BrandOrnament from '../ui/BrandOrnament.vue'
</script>

<template>
  <section
    class="relative overflow-hidden border-b border-border bg-bg"
    :style="{ backgroundImage: 'var(--oc-glow)' }"
  >
    <BrandOrnament
      name="corner-1"
      class="pointer-events-none absolute left-4 top-6 h-40 w-40 opacity-60 md:h-40 md:w-40"
    />
    <BrandOrnament
      name="corner-2"
      class="pointer-events-none absolute right-4 top-6 h-40 w-40 opacity-60 md:h-40 md:w-40"
    />
    <BrandOrnament
      name="corner-3"
      class="pointer-events-none absolute bottom-6 left-4 h-40 w-40 opacity-60 md:h-40 md:w-40"
    />
    <BrandOrnament
      name="corner-4"
      class="pointer-events-none absolute bottom-6 right-4 h-40 w-40 opacity-60 md:h-40 md:w-40"
    />

    <div
      class="relative mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center md:px-8"
    >
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-[0.08em] text-logo-gradient md:text-6xl">
        {{ site.title }}
      </h1>
      <p
        class="mt-8 font-body text-xl font-semibold uppercase tracking-[0.32em] text-logo-gradient"
      >
        {{ site.subtitle }}
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <span class="h-px w-10 bg-accent-satin/70" />
        <span class="h-px w-10 bg-accent-satin/70" />
      </div>

      <p class="mt-6 max-w-xl font-accent text-xl italic leading-relaxed text-text md:text-2xl">
        {{ site.slogan }}
      </p>

      <div class="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
        <RouterLink v-slot="{ href, navigate }" to="/servicios" custom>
          <BaseButton as="a" :href="href" size="lg" @click="navigate">Descubrir Hipnosis</BaseButton>
        </RouterLink>
        <RouterLink v-slot="{ href, navigate }" to="/servicios" custom>
          <BaseButton as="a" :href="href" variant="secondary" size="lg" @click="navigate">
            NUESTROS SERVICIOS
          </BaseButton>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
