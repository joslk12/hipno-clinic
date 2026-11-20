<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
    as?: 'button' | 'a'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
    as: 'button'
  }
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const isDisabled = computed(() => props.disabled || props.loading)

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-logo-gradient text-charcoal hover:brightness-110',
  secondary: 'border border-accent-satin text-logo-gradient hover:bg-accent-satin/10',
  ghost: 'text-logo-gradient hover:bg-accent-satin/10'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-7 text-base'
}

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-md font-body font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
  variantClasses[props.variant],
  sizeClasses[props.size],
  isDisabled.value ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
])

function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}
</script>

<template>
  <component
    :is="as"
    v-bind="$attrs"
    :type="as === 'button' ? type : undefined"
    :disabled="as === 'button' ? isDisabled : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :tabindex="as === 'a' && isDisabled ? -1 : undefined"
    :class="classes"
    @click="handleClick"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </component>
</template>
