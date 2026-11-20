<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'
import horizontalPng from '../../assets/brand/logos/origen-consciente-horizontal.png'
import minimalPng from '../../assets/brand/logos/origen-consciente-minimal.png'
import verticalPng from '../../assets/brand/logos/origen-consciente-vertical.png'
import symbolPng from '../../assets/brand/logos/origen-symbol.png'
import wordmarkPng from '../../assets/brand/logos/origen-wordmark.png'
import horizontalLight from '../../assets/brand/logos/origen-consciente-horizontal-light.png'
import minimalLight from '../../assets/brand/logos/origen-consciente-minimal-light.png'
import verticalLight from '../../assets/brand/logos/origen-consciente-vertical-light.png'
import symbolLight from '../../assets/brand/logos/origen-symbol-light.png'
import wordmarkLight from '../../assets/brand/logos/origen-wordmark-light.png'

type LogoVariant = 'horizontal' | 'vertical' | 'minimal' | 'symbol' | 'wordmark'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: LogoVariant
    alt?: string
    decorative?: boolean
    loading?: 'lazy' | 'eager'
  }>(),
  {
    variant: 'horizontal',
    alt: undefined,
    decorative: false,
    loading: 'eager'
  }
)

const logos = {
  horizontal: {
    src: horizontalPng,
    lightSrc: horizontalLight,
    width: 1005,
    height: 455,
    alt: 'Origen Consciente'
  },
  vertical: {
    src: verticalPng,
    lightSrc: verticalLight,
    width: 570,
    height: 701,
    alt: 'Origen Consciente'
  },
  minimal: {
    src: minimalPng,
    lightSrc: minimalLight,
    width: 1008,
    height: 455,
    alt: 'Origen Consciente'
  },
  symbol: {
    src: symbolPng,
    lightSrc: symbolLight,
    width: 363,
    height: 455,
    alt: 'Símbolo de Origen Consciente'
  },
  wordmark: {
    src: wordmarkPng,
    lightSrc: wordmarkLight,
    width: 616,
    height: 203,
    alt: 'Origen Consciente'
  }
} as const

const { isDark } = useTheme()

const logo = computed(() => {
  const entry = logos[props.variant]
  const src = !isDark.value && entry.lightSrc ? entry.lightSrc : entry.src

  return { ...entry, src }
})
const imageAlt = computed(() => (props.decorative ? '' : (props.alt ?? logo.value.alt)))
</script>

<template>
  <img
    v-bind="$attrs"
    :src="logo.src"
    :width="logo.width"
    :height="logo.height"
    :alt="imageAlt"
    :aria-hidden="decorative ? 'true' : undefined"
    :loading="loading"
    decoding="async"
  />
</template>
