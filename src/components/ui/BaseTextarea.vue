<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    label: string
    modelValue?: string
    error?: string
    required?: boolean
    optional?: boolean
    autocomplete?: string
    rows?: number
  }>(),
  {
    id: undefined,
    modelValue: '',
    error: undefined,
    required: false,
    optional: false,
    autocomplete: undefined,
    rows: 4
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const generatedId = useId()
const inputId = computed(() => props.id ?? `field-${generatedId}`)
const errorId = computed(() => `${inputId.value}-error`)

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="space-y-2">
    <label :for="inputId" class="block font-body text-sm font-medium text-text">
      {{ label }}
      <span v-if="optional" class="text-text-muted">(opcional)</span>
      <textarea
        :id="inputId"
        v-bind="$attrs"
        :value="modelValue"
        :rows="rows"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-required="required ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :class="[
          'mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        ]"
        @input="handleInput"
      />
    </label>
    <p v-if="error" :id="errorId" class="font-body text-sm text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
