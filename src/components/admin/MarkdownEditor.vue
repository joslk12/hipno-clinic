<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import BaseButton from '../ui/BaseButton.vue'
import { AdminBlogApiError, uploadImage } from '../../services/adminBlog'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    error?: string
  }>(),
  {
    modelValue: '',
    error: undefined
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const generatedId = useId()
const fieldId = computed(() => `markdown-${generatedId}`)
const errorId = computed(() => `${fieldId.value}-error`)
const textarea = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const preview = computed(() => {
  const html = marked.parse(props.modelValue, {
    async: false,
    breaks: true,
    gfm: true
  }) as string

  if (typeof window === 'undefined') return html
  const purify = DOMPurify as unknown as { sanitize?: (value: string) => string }
  return typeof purify.sanitize === 'function' ? purify.sanitize(html) : html
})

function setValue(value: string, selectionStart?: number, selectionEnd?: number) {
  emit('update:modelValue', value)
  if (selectionStart === undefined) return

  void nextTick(() => {
    const element = textarea.value
    if (!element) return
    element.focus()
    element.setSelectionRange(selectionStart, selectionEnd ?? selectionStart)
  })
}

function wrap(before: string, after: string, placeholder: string) {
  const element = textarea.value
  if (!element) return

  const start = element.selectionStart
  const end = element.selectionEnd
  const selected = props.modelValue.slice(start, end) || placeholder
  const next = `${props.modelValue.slice(0, start)}${before}${selected}${after}${props.modelValue.slice(end)}`
  setValue(next, start + before.length, start + before.length + selected.length)
}

function prefixLine(prefix: string) {
  const element = textarea.value
  if (!element) return

  const start = element.selectionStart
  const lineStart = props.modelValue.lastIndexOf('\n', start - 1) + 1
  const next = `${props.modelValue.slice(0, lineStart)}${prefix}${props.modelValue.slice(lineStart)}`
  setValue(next, start + prefix.length)
}

function insertAtCursor(text: string) {
  const element = textarea.value
  if (!element) return

  const start = element.selectionStart
  const end = element.selectionEnd
  const next = `${props.modelValue.slice(0, start)}${text}${props.modelValue.slice(end)}`
  setValue(next, start + text.length)
}

function chooseImage() {
  fileInput.value?.click()
}

async function handleImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploading.value = true
  uploadError.value = ''

  try {
    const result = await uploadImage(file)
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
    insertAtCursor(`![${alt}](${result.url})`)
  } catch (caught) {
    uploadError.value =
      caught instanceof AdminBlogApiError ? caught.message : 'No pudimos subir la imagen.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <label :for="fieldId" class="block font-body text-sm font-medium text-text">Contenido</label>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div class="flex flex-wrap gap-1 border-b border-border bg-surface-alt p-2" role="toolbar" aria-label="Formato de texto">
        <button type="button" class="toolbar-button font-bold" aria-label="Negritas" @click="wrap('**', '**', 'texto')">B</button>
        <button type="button" class="toolbar-button italic" aria-label="Cursivas" @click="wrap('*', '*', 'texto')">I</button>
        <button type="button" class="toolbar-button" aria-label="Título de sección" @click="prefixLine('## ')">H2</button>
        <button type="button" class="toolbar-button" aria-label="Lista" @click="prefixLine('- ')">•</button>
        <button type="button" class="toolbar-button" aria-label="Enlace" @click="wrap('[', '](https://)', 'texto del enlace')">Enlace</button>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Insertar imagen"
          :disabled="uploading"
          @click="chooseImage"
        >
          {{ uploading ? 'Subiendo…' : 'Imagen' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="sr-only"
          @change="handleImage"
        />
      </div>

      <div class="grid gap-0 lg:grid-cols-2">
        <textarea
          :id="fieldId"
          ref="textarea"
          :value="modelValue"
          rows="18"
          class="min-h-[22rem] w-full resize-y border-0 bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-text placeholder:text-text-muted focus:outline-none focus:ring-0"
          placeholder="Escribe el contenido en Markdown…"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? errorId : undefined"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        />
        <div class="border-t border-border bg-bg p-4 lg:border-l lg:border-t-0">
          <p class="font-body text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Vista previa
          </p>
          <div class="blog-content mt-3 max-h-[28rem] overflow-y-auto break-words" v-html="preview" />
        </div>
      </div>
    </div>

    <p v-if="error" :id="errorId" class="font-body text-sm text-red-500" role="alert">
      {{ error }}
    </p>
    <p v-if="uploadError" class="font-body text-sm text-red-500" role="alert">
      {{ uploadError }}
    </p>
    <div class="flex justify-end">
      <BaseButton
        type="button"
        variant="ghost"
        size="sm"
        :loading="uploading"
        @click="chooseImage"
      >
        Subir imagen al contenido
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.toolbar-button {
  min-height: 2rem;
  border-radius: 0.375rem;
  padding: 0.25rem 0.6rem;
  font-family: var(--oc-font-body);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--oc-text);
  transition: background-color 150ms ease;
}

.toolbar-button:hover:not(:disabled) {
  background: var(--oc-surface);
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
