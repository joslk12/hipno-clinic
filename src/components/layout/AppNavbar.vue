<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { navLinks } from '../../content/navigation'
import BaseButton from '../ui/BaseButton.vue'
import BrandIcon from '../ui/BrandIcon.vue'
import BrandLogo from '../ui/BrandLogo.vue'
import ThemeToggle from '../ui/ThemeToggle.vue'
import MobileMenu from './MobileMenu.vue'

const route = useRoute()
const isMenuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const mobileMenuWrapper = ref<HTMLElement | null>(null)

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu(restoreFocus = false) {
  if (!isMenuOpen.value) return

  isMenuOpen.value = false

  if (restoreFocus) {
    nextTick(() => menuButton.value?.focus())
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMenuOpen.value) return

  const target = event.target as Node

  if (mobileMenuWrapper.value?.contains(target) || menuButton.value?.contains(target)) {
    return
  }

  closeMenu()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isMenuOpen.value) return

  event.preventDefault()
  closeMenu(true)
}

watch(
  () => route.path,
  () => closeMenu()
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border nav-glass backdrop-blur">
    <div class="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
      <RouterLink to="/" aria-label="Origen Consciente, ir al inicio">
        <BrandLogo variant="minimal" class="h-14 w-auto md:h-16" />
      </RouterLink>

      <nav aria-label="Navegación principal" class="hidden items-center gap-6 lg:flex">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          :class="[
            'font-body text-sm font-medium transition-colors',
            isActive(link.to) ? 'text-accent' : 'text-text-muted hover:text-accent'
          ]"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center gap-3 lg:flex">
        <ThemeToggle />
        <RouterLink v-slot="{ href, navigate }" to="/contacto" custom>
          <BaseButton as="a" :href="href" size="sm" @click="navigate">AGENDAR CITA</BaseButton>
        </RouterLink>
      </div>

      <button
        ref="menuButton"
        type="button"
        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-accent transition-colors hover:border-accent lg:hidden"
        :aria-expanded="isMenuOpen ? 'true' : 'false'"
        aria-controls="mobile-menu"
        :aria-label="isMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="toggleMenu"
      >
        <BrandIcon v-if="isMenuOpen" name="close" decorative class="h-6 w-6" />
        <BrandIcon v-else name="menu" decorative class="h-6 w-6" />
      </button>
    </div>

    <div ref="mobileMenuWrapper" class="lg:hidden">
      <MobileMenu
        v-show="isMenuOpen"
        id="mobile-menu"
        :links="navLinks"
        :open="isMenuOpen"
        @close="closeMenu(false)"
      />
    </div>
  </header>
</template>
