<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { contact, mapsUrl } from '../../content/contact'
import BrandIcon from '../ui/BrandIcon.vue'

const props = withDefaults(
  defineProps<{
    embedUrl?: string
  }>(),
  {
    embedUrl: import.meta.env.VITE_GOOGLE_MAPS_EMBED_URL
  }
)

const container = ref<HTMLElement | null>(null)
const shouldLoad = ref(false)
const hasError = ref(false)
let observer: IntersectionObserver | undefined
let hasObserved = false

const showMap = computed(() => Boolean(props.embedUrl) && shouldLoad.value && !hasError.value)

function loadMap() {
  shouldLoad.value = true
  observer?.disconnect()
}

onMounted(() => {
  if (!props.embedUrl) return
  if (typeof IntersectionObserver === 'undefined') {
    loadMap()
    return
  }

  if (!container.value) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMap()
    },
    { rootMargin: '200px' }
  )

  observer.observe(container.value)
  hasObserved = true
})

onBeforeUnmount(() => {
  if (hasObserved) observer?.disconnect()
})
</script>

<template>
  <div>
    <h2 class="font-display text-2xl font-semibold text-accent">Ubicación</h2>

    <div
      ref="container"
      class="map-frame mt-5 overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div v-if="showMap" class="aspect-[4/3]">
        <iframe
          :src="embedUrl"
          title="Ubicación de Origen Consciente en Santiago Tolman"
          class="h-full w-full border-0"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
          @error="hasError = true"
        />
      </div>

      <div
        v-else
        class="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <BrandIcon name="map-pin" decorative class="h-8 w-8" />
        <p class="font-body text-sm text-text-muted">
          El mapa no está disponible en este momento.
        </p>
        <a
          :href="mapsUrl()"
          target="_blank"
          rel="noopener noreferrer"
          class="font-body text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Abrir en Google Maps
        </a>
      </div>
    </div>

    <p class="mt-3 flex items-center gap-2 font-body text-sm text-text-muted">
      <BrandIcon name="map-pin" decorative class="h-4 w-4 shrink-0" />
      {{ contact.location }}
    </p>
  </div>
</template>
