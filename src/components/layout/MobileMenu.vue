<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { NavLink } from '../../content/navigation'
import BaseButton from '../ui/BaseButton.vue'
import ThemeToggle from '../ui/ThemeToggle.vue'

const props = defineProps<{
  id: string
  links: NavLink[]
  open: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const menuRoot = ref<HTMLElement | null>(null)

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)
}

function goToContact(event: MouseEvent, navigate: (event?: MouseEvent) => void) {
  emit('close')
  navigate(event)
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return

    await nextTick()
    menuRoot.value?.querySelector<HTMLElement>('a')?.focus()
  }
)
</script>

<template>
  <div
    :id="id"
    ref="menuRoot"
    class="absolute inset-x-4 top-full z-50 mt-2 rounded-2xl border border-border bg-surface p-4 shadow-gold lg:hidden"
  >
    <nav aria-label="Menú de navegación móvil">
      <ul class="space-y-1">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            :aria-current="isActive(link.to) ? 'page' : undefined"
            :class="[
              'block rounded-md px-3 py-3 font-body text-base font-medium transition-colors',
              isActive(link.to)
                ? 'bg-surface-alt text-accent'
                : 'text-text hover:bg-surface-alt hover:text-accent'
            ]"
            @click="emit('close')"
          >
            {{ link.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <ThemeToggle />
      <RouterLink v-slot="{ href, navigate }" to="/contacto" custom>
        <BaseButton as="a" :href="href" size="sm" @click="goToContact($event, navigate)">
          AGENDAR CITA
        </BaseButton>
      </RouterLink>
    </div>
  </div>
</template>
