<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'
import corner1 from '../../assets/brand/library/asset4sinfondo/comp-19.png'
import corner2 from '../../assets/brand/library/asset4sinfondo/comp-23.png'
import corner3 from '../../assets/brand/library/asset4sinfondo/comp-24.png'
import corner4 from '../../assets/brand/library/asset4sinfondo/comp-25.png'
import regenerative from '../../assets/brand/library/asset1sinfongo/comp-02.png'
import goldenRatio1 from '../../assets/brand/icons/golden-ratio-01.png'
import goldenRatio2 from '../../assets/brand/icons/golden-ratio-02.png'
import divider3 from '../../assets/brand/icons/small-ornament-03.png'
import divider3Light from '../../assets/brand/icons/small-ornament-03-light.png'
import divider2 from '../../assets/brand/icons/small-ornament-02.png'
import divider2Light from '../../assets/brand/icons/small-ornament-02-light.png'
import divider1 from '../../assets/brand/icons/small-ornament-01.png'
import divider1Light from '../../assets/brand/icons/small-ornament-01-light.png'
import regressive from '../../assets/brand/library/asset1sinfongo/comp-15.png'
import healing from '../../assets/brand/library/asset1sinfongo/comp-16.png'
import regenerativeLight from '../../assets/brand/library/asset1sinfongo/comp-02-light.png'
import regressiveLight from '../../assets/brand/library/asset1sinfongo/comp-15-light.png'
import healingLight from '../../assets/brand/library/asset1sinfongo/comp-16-light.png'

defineOptions({ inheritAttrs: false })

const ornaments = {
  'corner-1': corner1,
  'corner-2': corner2,
  'corner-3': corner3,
  'corner-4': corner4,
  'golden-ratio-1': goldenRatio1,
  'golden-ratio-2': goldenRatio2,
  'divider-3': divider3,
  'divider-2': divider2,
  'divider-1': divider1,
  'regenerative': regenerative,
  'regressive': regressive,
  'healing': healing
} as const

type OrnamentName = keyof typeof ornaments

const lightOrnaments: Partial<Record<OrnamentName, string>> = {
  'divider-3': divider3Light,
  'divider-2': divider2Light,
  'divider-1': divider1Light,
  regenerative: regenerativeLight,
  regressive: regressiveLight,
  healing: healingLight
}

const props = defineProps<{
  name: OrnamentName
}>()

const { isDark } = useTheme()

const src = computed(() => {
  const light = lightOrnaments[props.name]

  return !isDark.value && light ? light : ornaments[props.name]
})
</script>

<template>
  <img v-bind="$attrs" :src="src" alt="" aria-hidden="true" decoding="async" class="object-contain" />
</template>
