<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  formatAppointmentDate,
  formatAppointmentTime
} from '../../content/appointments'
import { getService } from '../../content/services'
import {
  AdminAppointmentsApiError,
  cancelBooking,
  listBookings
} from '../../services/adminAppointments'
import type { Appointment } from '../../types/appointments'
import BaseButton from '../ui/BaseButton.vue'

const emit = defineEmits<{ unauthorized: []; notice: [message: string] }>()

const appointments = ref<Appointment[]>([])
const loading = ref(true)
const error = ref('')
const cancelling = ref('')

const hasAppointments = computed(() => appointments.value.length > 0)

function serviceName(serviceId: string | null): string {
  return serviceId ? (getService(serviceId)?.name ?? serviceId) : 'Sin servicio específico'
}

function appointmentLabel(appointment: Appointment): string {
  return `la cita de ${appointment.name} del ${formatAppointmentDate(appointment.startsAt)}`
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    appointments.value = await listBookings()
  } catch (caught) {
    if (caught instanceof AdminAppointmentsApiError && caught.status === 401) {
      emit('unauthorized')
      return
    }

    error.value =
      caught instanceof AdminAppointmentsApiError
        ? caught.message
        : 'No pudimos cargar las citas.'
  } finally {
    loading.value = false
  }
}

async function cancel(appointment: Appointment) {
  if (
    typeof window !== 'undefined' &&
    !window.confirm(`¿Cancelar ${appointmentLabel(appointment)}?`)
  ) {
    return
  }

  cancelling.value = appointment.id
  error.value = ''

  try {
    const updated = await cancelBooking(appointment.id)
    const index = appointments.value.findIndex((item) => item.id === updated.id)
    if (index !== -1) appointments.value[index] = updated
    emit('notice', 'Cita cancelada. El horario vuelve a estar disponible.')
  } catch (caught) {
    if (caught instanceof AdminAppointmentsApiError && caught.status === 401) {
      emit('unauthorized')
      return
    }

    error.value =
      caught instanceof AdminAppointmentsApiError
        ? caught.message
        : 'No pudimos cancelar la cita.'
  } finally {
    cancelling.value = ''
  }
}

onMounted(load)

defineExpose({ load })
</script>

<template>
  <section class="rounded-2xl border border-border bg-surface p-5 md:p-6" aria-labelledby="appointments-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="appointments-title" class="font-display text-xl font-semibold text-accent">
          Citas reservadas
        </h2>
        <p class="mt-1 font-body text-sm text-text-muted">
          Listado de reservas y su estado actual.
        </p>
      </div>
      <BaseButton type="button" variant="secondary" size="sm" @click="load">Actualizar</BaseButton>
    </div>

    <p v-if="loading" class="mt-5 font-body text-sm text-text-muted" role="status" aria-live="polite">
      Cargando citas…
    </p>

    <p
      v-if="error"
      class="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-sm text-red-500"
      role="alert"
      aria-live="polite"
    >
      {{ error }}
    </p>

    <template v-if="!loading && hasAppointments">
      <div class="mt-5 overflow-x-auto">
        <table class="w-full border-collapse text-left font-body text-sm">
          <caption class="sr-only">Citas registradas</caption>
          <thead>
            <tr class="border-b border-border text-text-muted">
              <th scope="col" class="px-2 py-3 font-semibold">Fecha</th>
              <th scope="col" class="px-2 py-3 font-semibold">Hora</th>
              <th scope="col" class="px-2 py-3 font-semibold">Servicio</th>
              <th scope="col" class="px-2 py-3 font-semibold">Contacto</th>
              <th scope="col" class="px-2 py-3 font-semibold">Estado</th>
              <th scope="col" class="px-2 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appointment in appointments" :key="appointment.id" class="border-b border-border/60">
              <td class="px-2 py-3 text-text">{{ formatAppointmentDate(appointment.startsAt) }}</td>
              <td class="px-2 py-3 text-text">{{ formatAppointmentTime(appointment.startsAt) }}</td>
              <td class="px-2 py-3 text-text">{{ serviceName(appointment.serviceId) }}</td>
              <td class="px-2 py-3 text-text">
                <span class="block">{{ appointment.name }}</span>
                <span class="block text-text-muted">{{ appointment.email }}</span>
                <span class="block text-text-muted">{{ appointment.phone || '—' }}</span>
              </td>
              <td class="px-2 py-3">
                <span
                  :class="[
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    appointment.status === 'reserved'
                      ? 'bg-accent-satin/15 text-accent'
                      : 'bg-surface-alt text-text-muted'
                  ]"
                >
                  {{ appointment.status === 'reserved' ? 'Reservada' : 'Cancelada' }}
                </span>
              </td>
              <td class="px-2 py-3">
                <BaseButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :disabled="appointment.status !== 'reserved' || cancelling === appointment.id"
                  :loading="cancelling === appointment.id"
                  @click="cancel(appointment)"
                >
                  CANCELAR CITA
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p v-else-if="!loading && !error" class="mt-5 font-body text-sm text-text-muted">
      Aún no hay citas registradas.
    </p>
  </section>
</template>
