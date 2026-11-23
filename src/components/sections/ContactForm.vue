<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { formatAppointmentDate, formatAppointmentTime } from '../../content/appointments'
import { getService } from '../../content/services'
import {
  AppointmentsApiError,
  createAppointment,
  listAvailableSlots
} from '../../services/appointments'
import { CONTACT_FORM_NAME, sendContact } from '../../services/contact'
import { useBookingStore, type ContactForm as ContactFormData } from '../../stores/booking'
import type { ScheduleSlot } from '../../types/appointments'
import AppointmentScheduler from './AppointmentScheduler.vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import BaseTextarea from '../ui/BaseTextarea.vue'

const booking = useBookingStore()
const honeypot = ref('')
const slots = ref<ScheduleSlot[]>([])
const loadingSlots = ref(true)
const slotsError = ref('')

const selectedService = computed(() =>
  booking.selectedServiceId ? getService(booking.selectedServiceId) : undefined
)
const hasErrors = computed(() => Object.keys(booking.errors).length > 0)
const isSubmitting = computed(() => booking.status === 'submitting')
const hasSlots = computed(() => slots.value.length > 0)

const fieldIds: Record<keyof ContactFormData, string> = {
  name: 'contact-name',
  email: 'contact-email',
  phone: 'contact-phone',
  message: 'contact-message'
}

const fieldOrder: Array<keyof ContactFormData> = ['name', 'email', 'phone', 'message']

function prefillMessage() {
  if (!booking.selectedServiceId || booking.form.message) return

  const service = getService(booking.selectedServiceId)

  if (!service) return

  booking.setField('message', `Hola Maricela, me interesa agendar una sesión de ${service.name}.`)
}

function validate() {
  const errors: Partial<Record<keyof ContactFormData, string>> = {}
  const name = booking.form.name.trim()
  const email = booking.form.email.trim()
  const phone = booking.form.phone.trim()
  const message = booking.form.message.trim()

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Escribe tu nombre completo.'
  }

  if (!email || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Escribe un correo válido.'
  }

  if (phone && (phone.length > 20 || !/^[0-9+\s]+$/.test(phone))) {
    errors.phone = 'El teléfono solo puede incluir números, espacios y +.'
  }

  if (message.length < 10 || message.length > 1000) {
    errors.message = 'Cuéntanos brevemente el motivo de tu consulta (mínimo 10 caracteres).'
  }

  booking.setErrors(errors)

  return Object.keys(errors).length === 0
}

async function focusFirstError() {
  await nextTick()

  const firstInvalid = fieldOrder.find((field) => booking.errors[field])

  if (firstInvalid) document.getElementById(fieldIds[firstInvalid])?.focus()
}

async function loadSlots() {
  loadingSlots.value = true
  slotsError.value = ''

  try {
    slots.value = await listAvailableSlots(undefined, undefined, booking.selectedServiceId)
  } catch {
    // Sin disponibilidad el formulario sigue funcionando exactamente como antes.
    slots.value = []
    slotsError.value = ''
  } finally {
    loadingSlots.value = false
  }
}

function handleSlotError(caught: AppointmentsApiError | null) {
  booking.clearSlot()
  booking.setSlotError('Ese horario ya no está disponible. Elige otro, por favor.')
  booking.setStatus(
    'error',
    caught?.message ?? 'Ese horario ya no está disponible. Elige otro, por favor.'
  )
  void loadSlots()
}

function applyBackendFields(fields?: Record<string, string>) {
  if (!fields) return

  const formErrors: Partial<Record<keyof ContactFormData, string>> = {}

  for (const field of fieldOrder) {
    if (fields[field]) formErrors[field] = fields[field]
  }

  if (Object.keys(formErrors).length) booking.setErrors(formErrors)
}

async function onSubmit() {
  if (isSubmitting.value) return
  if (honeypot.value.trim()) return

  booking.setStatus('idle')
  booking.setSlotError()

  if (!validate()) {
    await focusFirstError()
    return
  }

  const selectedSlot = hasSlots.value ? booking.selectedSlot : null
  booking.setStatus('submitting')

  if (selectedSlot) {
    try {
      const appointment = await createAppointment({
        slotKey: selectedSlot.slotKey,
        name: booking.form.name.trim(),
        email: booking.form.email.trim(),
        phone: booking.form.phone.trim(),
        message: booking.form.message.trim(),
        serviceId: selectedSlot.serviceId ?? booking.selectedServiceId
      })
      const date = formatAppointmentDate(appointment.startsAt)
      const time = formatAppointmentTime(appointment.startsAt)

      booking.clearFields()
      booking.clearSlot()
      booking.setStatus('success', `Gracias por escribirnos. Tu cita está confirmada para el ${date} a las ${time}.`)
      await loadSlots()
    } catch (caught) {
      if (caught instanceof AppointmentsApiError && caught.slotConflict) {
        handleSlotError(caught)
        return
      }

      applyBackendFields(caught instanceof AppointmentsApiError ? caught.fields : undefined)
      booking.setStatus(
        'error',
        caught instanceof AppointmentsApiError
          ? caught.message
          : 'No pudimos agendar tu cita. Revisa tu conexión e inténtalo de nuevo.'
      )
    }

    return
  }

  try {
    await sendContact({
      name: booking.form.name.trim(),
      email: booking.form.email.trim(),
      phone: booking.form.phone.trim(),
      message: booking.form.message.trim()
    })

    booking.clearFields()
    booking.setStatus(
      'success',
      'Gracias por escribirnos. Te contactaremos pronto para agendar tu sesión.'
    )
  } catch {
    booking.setStatus(
      'error',
      'No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.'
    )
  }
}

function handleSlotSelection(slot: ScheduleSlot) {
  booking.selectSlot(slot)
}

onMounted(() => {
  prefillMessage()
  void loadSlots()
})
watch(() => booking.selectedServiceId, () => {
  prefillMessage()
  if (booking.selectedSlot && booking.selectedSlot.serviceId !== booking.selectedServiceId) {
    booking.clearSlot()
  }
  void loadSlots()
})
</script>

<template>
  <form
    :name="CONTACT_FORM_NAME"
    method="POST"
    data-netlify="true"
    netlify-honeypot="bot-field"
    novalidate
    :aria-busy="isSubmitting ? 'true' : undefined"
    @submit.prevent="onSubmit"
  >
    <input type="hidden" name="form-name" :value="CONTACT_FORM_NAME" />

    <p
      v-if="selectedService"
      class="mb-6 rounded-lg border border-border bg-surface-alt px-4 py-3 font-body text-sm text-text"
    >
      Servicio seleccionado:
      <strong class="font-semibold text-accent">{{ selectedService.name }}</strong>
    </p>

    <AppointmentScheduler
      v-if="hasSlots"
      class="mb-6"
      :slots="slots"
      :loading="loadingSlots"
      :error="slotsError"
      :selected-slot-key="booking.selectedSlot?.slotKey ?? null"
      @select="handleSlotSelection"
    />

    <p
      v-if="booking.slotError"
      class="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-sm text-red-500"
      role="alert"
      aria-live="polite"
    >
      {{ booking.slotError }}
    </p>

    <div class="space-y-5">
      <BaseInput
        :id="fieldIds.name"
        label="Nombre Completo"
        :model-value="booking.form.name"
        :error="booking.errors.name"
        autocomplete="name"
        maxlength="80"
        required
        @update:model-value="booking.setField('name', $event)"
      />

      <BaseInput
        :id="fieldIds.email"
        label="Correo Electrónico"
        type="email"
        :model-value="booking.form.email"
        :error="booking.errors.email"
        autocomplete="email"
        maxlength="120"
        required
        @update:model-value="booking.setField('email', $event)"
      />

      <BaseInput
        :id="fieldIds.phone"
        label="Teléfono o WhatsApp"
        type="tel"
        inputmode="tel"
        :model-value="booking.form.phone"
        :error="booking.errors.phone"
        autocomplete="tel"
        maxlength="20"
        optional
        @update:model-value="booking.setField('phone', $event)"
      />

      <BaseTextarea
        :id="fieldIds.message"
        label="Mensaje o Motivo de Consulta"
        :model-value="booking.form.message"
        :error="booking.errors.message"
        :rows="5"
        maxlength="1000"
        required
        @update:model-value="booking.setField('message', $event)"
      />
    </div>

    <div class="hidden" aria-hidden="true">
      <label for="bot-field">No completar</label>
      <input id="bot-field" v-model="honeypot" name="bot-field" tabindex="-1" autocomplete="off" />
    </div>

    <p
      v-if="hasErrors"
      class="mt-5 font-body text-sm font-medium text-red-500"
      role="alert"
      aria-live="polite"
    >
      Revisa los campos marcados.
    </p>

    <p
      v-if="booking.feedback"
      :role="booking.status === 'error' ? 'alert' : 'status'"
      aria-live="polite"
      :class="[
        'mt-5 rounded-lg border px-4 py-3 font-body text-sm',
        booking.status === 'error'
          ? 'border-red-500/50 bg-red-500/10 text-red-500'
          : 'border-accent-satin/50 bg-accent-satin/10 text-text'
      ]"
    >
      {{ booking.feedback }}
    </p>

    <div class="mt-6">
      <BaseButton type="submit" size="lg" :loading="isSubmitting" class="w-full sm:w-auto">
        {{ isSubmitting ? 'ENVIANDO…' : 'ENVIAR MENSAJE' }}
      </BaseButton>
    </div>
  </form>
</template>
