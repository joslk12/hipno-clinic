<script setup lang="ts">
import AppFooter from './AppFooter.vue'
import AppNavbar from './AppNavbar.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg text-text">
    <a class="skip-link" href="#main">Saltar al contenido</a>
    <AppNavbar />
    <main id="main" tabindex="-1" class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
