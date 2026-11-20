<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Service } from '../../content/services'
import { useBookingStore } from '../../stores/booking'
import BaseBadge from '../ui/BaseBadge.vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseCard from '../ui/BaseCard.vue'
import BrandOrnament from '../ui/BrandOrnament.vue'
import { serviceOrnament } from './serviceOrnament'

const props = withDefaults(
  defineProps<{
    service: Service
    headingLevel?: 'h2' | 'h3'
  }>(),
  {
    headingLevel: 'h2'
  }
)

const router = useRouter()
const booking = useBookingStore()

function onBook() {
  booking.selectService(props.service.id)
  router.push({ name: 'contact' })
}
</script>

<template>
  <BaseCard :id="service.id" as="article" class="flex h-full scroll-mt-28 flex-col p-6">
    <BrandOrnament :name="serviceOrnament(service.icon)" class="h-16 w-16" />
    <component :is="headingLevel" class="mt-4 font-display text-2xl font-semibold text-text">
      {{ service.name }}
    </component>
    <p class="mt-3 flex-1 font-body text-sm leading-relaxed text-text-muted">
      {{ service.description }}
    </p>
    <div class="mt-5 flex flex-wrap gap-2">
      <BaseBadge tone="neutral">{{ service.price }}</BaseBadge>
    </div>
    <BaseButton class="mt-6 w-full" :data-service-id="service.id" @click="onBook">
      {{ service.ctaLabel }}
    </BaseButton>
  </BaseCard>
</template>
