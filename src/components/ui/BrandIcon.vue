<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'
import close from '../../assets/brand/icons/close.png'
import mail from '../../assets/brand/icons/mail.png'
import mapPin from '../../assets/brand/icons/map-pin.png'
import menu from '../../assets/brand/icons/menu.png'
import moon from '../../assets/brand/icons/moon.png'
import phone from '../../assets/brand/icons/phone.png'
import sun from '../../assets/brand/icons/sun.png'
import whatsapp from '../../assets/brand/icons/whatsapp.png'
import mailLight from '../../assets/brand/icons/mail-light.png'
import mapPinLight from '../../assets/brand/icons/map-pin-light.png'
import whatsappLight from '../../assets/brand/icons/whatsapp-light.png'

defineOptions({ inheritAttrs: false })

const icons = {
  whatsapp,
  mail,
  'map-pin': mapPin,
  phone,
  moon,
  sun,
  menu,
  close
} as const

type IconName = keyof typeof icons

const lightIcons: Partial<Record<IconName, string>> = {
  whatsapp: whatsappLight,
  mail: mailLight,
  'map-pin': mapPinLight
}

const defaultLabels: Record<IconName, string> = {
  whatsapp: 'WhatsApp',
  mail: 'Correo electrónico',
  'map-pin': 'Ubicación',
  phone: 'Teléfono',
  moon: 'Tema oscuro',
  sun: 'Tema claro',
  menu: 'Menú',
  close: 'Cerrar'
}

const props = withDefaults(
  defineProps<{
    name: IconName
    label?: string
    decorative?: boolean
  }>(),
  {
    label: undefined,
    decorative: false
  }
)

const { isDark } = useTheme()

const src = computed(() => {
  const light = lightIcons[props.name]

  return !isDark.value && light ? light : icons[props.name]
})
const accessibleLabel = computed(() => props.label ?? defaultLabels[props.name])
</script>

<template>
  <img
    v-bind="$attrs"
    :src="src"
    :alt="decorative ? '' : accessibleLabel"
    :aria-hidden="decorative ? 'true' : undefined"
    decoding="async"
    class="object-contain"
  />
</template>
