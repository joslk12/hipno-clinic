<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  BOOKING_HORIZON_DAYS,
  CALENDAR_WEEKDAYS,
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_SHORT,
  addDaysToDateKey,
  formatAppointmentDate,
  formatMonthLabel,
  getLocalDateKey,
  getWeekdayFromDateKey,
  monthKeyFromDateKey,
  shiftMonthKey
} from '../../content/appointments'
import { getService, services } from '../../content/services'
import {
  AdminAppointmentsApiError,
  createManualSlot,
  createRule,
  deleteManualSlot,
  deleteRule,
  listBookings,
  listManualSlots,
  listRules,
  setSlotBlocked,
  updateRule
} from '../../services/adminAppointments'
import type {
  Appointment,
  AvailabilityRule,
  AvailabilityRuleInput,
  ManualSlotInput,
  ManualSlotRecord,
  Weekday
} from '../../types/appointments'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'

const emit = defineEmits<{ unauthorized: []; notice: [message: string] }>()

type DayStatus = 'empty' | 'available' | 'reserved' | 'blocked'

const todayKey = getLocalDateKey()
const horizonKey = addDaysToDateKey(todayKey, BOOKING_HORIZON_DAYS)
const firstMonth = monthKeyFromDateKey(todayKey)
const lastMonth = monthKeyFromDateKey(horizonKey)
const visibleMonth = ref(firstMonth)

const rules = ref<AvailabilityRule[]>([])
const manualSlots = ref<ManualSlotRecord[]>([])
const bookings = ref<Appointment[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const saving = ref(false)
const editingRuleId = ref<string | null>(null)
/** Reglas con la misma hora/duración/servicio/vigencia se editan como un grupo. */
const editingGroupIds = ref<string[]>([])
const selectedDay = ref<string | null>(null)
const blockUntil = ref('20:00')

function emptyRuleForm() {
  return {
    weekdays: ['1'] as string[],
    startTime: '10:00',
    durationMinutes: 60,
    serviceId: '',
    validFrom: '',
    validUntil: '',
    active: true
  }
}

const ruleForm = reactive(emptyRuleForm())
const slotForm = reactive({ date: todayKey, time: '10:00', durationMinutes: 60, serviceId: '' })
const extraSlotForm = reactive({ time: '11:00', durationMinutes: 60 })

const monthLabel = computed(() => {
  const [visibleYear, visibleMonthNumber] = visibleMonth.value.split('-').map(Number)
  return formatMonthLabel(visibleYear, visibleMonthNumber)
})

const offset = computed(() => (getWeekdayFromDateKey(`${visibleMonth.value}-01`) + 6) % 7)
const daysInMonth = computed(() => {
  const [visibleYear, visibleMonthNumber] = visibleMonth.value.split('-').map(Number)
  return new Date(Date.UTC(visibleYear, visibleMonthNumber, 0)).getUTCDate()
})
const calendarDays = computed(() =>
  Array.from({ length: offset.value + daysInMonth.value }, (_, index) =>
    index < offset.value ? null : `${visibleMonth.value}-${String(index - offset.value + 1).padStart(2, '0')}`
  )
)
const weekCount = computed(() => Math.ceil(calendarDays.value.length / 7))

const canGoPrevious = computed(() => visibleMonth.value > firstMonth)
const canGoNext = computed(() => visibleMonth.value < lastMonth)

function serviceName(serviceId: string | null): string {
  return serviceId ? (getService(serviceId)?.name ?? serviceId) : 'Cualquier servicio'
}

function errorFor(field: string): string {
  return fieldErrors.value[field] ?? ''
}

function resetRuleForm() {
  Object.assign(ruleForm, emptyRuleForm())
  editingRuleId.value = null
  editingGroupIds.value = []
  fieldErrors.value = {}
}

function ruleGroupOf(rule: AvailabilityRule): AvailabilityRule[] {
  return rules.value.filter(
    (item) =>
      item.id === rule.id ||
      (item.startTime === rule.startTime &&
        item.durationMinutes === rule.durationMinutes &&
        item.serviceId === rule.serviceId &&
        item.validFrom === rule.validFrom &&
        item.validUntil === rule.validUntil &&
        item.active === rule.active)
  )
}

function handleError(caught: unknown, fallback: string) {
  fieldErrors.value = {}

  if (caught instanceof AdminAppointmentsApiError) {
    if (caught.status === 401) {
      emit('unauthorized')
      return
    }

    fieldErrors.value = { ...(caught.fields ?? {}) }
    actionError.value = caught.message
    return
  }

  actionError.value = fallback
}

async function load() {
  loading.value = true
  loadError.value = ''

  try {
    const [ruleData, slotData, bookingData] = await Promise.all([
      listRules(),
      listManualSlots(),
      listBookings()
    ])
    rules.value = ruleData
    manualSlots.value = slotData
    bookings.value = bookingData
  } catch (caught) {
    if (caught instanceof AdminAppointmentsApiError && caught.status === 401) {
      emit('unauthorized')
    } else {
      loadError.value =
        caught instanceof AdminAppointmentsApiError ? caught.message : 'No pudimos cargar la disponibilidad.'
    }
  } finally {
    loading.value = false
  }
}

function editRule(rule: AvailabilityRule) {
  actionError.value = ''
  fieldErrors.value = {}
  const group = ruleGroupOf(rule)
  editingRuleId.value = rule.id
  editingGroupIds.value = group.map((item) => item.id)
  Object.assign(ruleForm, {
    weekdays: [...new Set(group.map((item) => String(item.weekday)))],
    startTime: rule.startTime,
    durationMinutes: rule.durationMinutes,
    serviceId: rule.serviceId ?? '',
    validFrom: rule.validFrom ?? '',
    validUntil: rule.validUntil ?? '',
    active: rule.active
  })
}

async function submitRule() {
  actionError.value = ''
  fieldErrors.value = {}

  const weekdays = [...new Set(ruleForm.weekdays.map(Number))].filter(
    (value): value is Weekday => value >= 0 && value <= 6
  )
  if (!weekdays.length) {
    fieldErrors.value = { weekday: 'Selecciona al menos un día.' }
    return
  }

  const baseInput: Omit<AvailabilityRuleInput, 'weekday'> = {
    startTime: ruleForm.startTime,
    durationMinutes: Number(ruleForm.durationMinutes),
    serviceId: ruleForm.serviceId || null,
    validFrom: ruleForm.validFrom || null,
    validUntil: ruleForm.validUntil || null,
    active: ruleForm.active
  }

  saving.value = true
  try {
    const wasEditing = Boolean(editingRuleId.value)
    if (wasEditing) {
      const group = rules.value.filter((item) => editingGroupIds.value.includes(item.id))
      for (const rule of group) {
        if (weekdays.includes(rule.weekday)) {
          await updateRule(rule.id, { ...baseInput, weekday: rule.weekday })
        } else {
          await deleteRule(rule.id)
        }
      }
      for (const weekday of weekdays) {
        if (!group.some((item) => item.weekday === weekday)) {
          await createRule({ ...baseInput, weekday })
        }
      }
    } else {
      for (const weekday of weekdays) {
        await createRule({ ...baseInput, weekday })
      }
    }

    const daysLabel = weekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join(', ')
    resetRuleForm()
    emit(
      'notice',
      wasEditing
        ? `Regla${weekdays.length > 1 ? 's' : ''} actualizada${weekdays.length > 1 ? 's' : ''} (${daysLabel}).`
        : `Regla${weekdays.length > 1 ? 's' : ''} creada${weekdays.length > 1 ? 's' : ''} (${daysLabel}).`
    )
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos guardar la regla.')
  } finally {
    saving.value = false
  }
}

async function removeRule(rule: AvailabilityRule) {
  actionError.value = ''
  fieldErrors.value = {}

  try {
    await deleteRule(rule.id)
    if (editingRuleId.value === rule.id) resetRuleForm()
    emit('notice', 'Regla eliminada.')
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos eliminar la regla.')
  }
}

async function submitSlot() {
  actionError.value = ''
  fieldErrors.value = {}
  saving.value = true

  const input: ManualSlotInput = {
    date: slotForm.date,
    time: slotForm.time,
    durationMinutes: Number(slotForm.durationMinutes),
    serviceId: slotForm.serviceId || null
  }

  try {
    await createManualSlot(input)
    slotForm.time = '10:00'
    emit('notice', 'Horario agregado.')
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos agregar el horario.')
  } finally {
    saving.value = false
  }
}

async function toggleBlock(slot: ManualSlotRecord) {
  await changeBlock(
    slot.slotKey,
    !slot.blocked,
    slot.blocked ? 'Horario desbloqueado.' : 'Horario bloqueado.'
  )
}

async function removeSlot(slot: ManualSlotRecord) {
  actionError.value = ''
  fieldErrors.value = {}

  try {
    await deleteManualSlot(slot.slotKey)
    emit('notice', 'Horario eliminado.')
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos eliminar el horario.')
  }
}

function ruleCoversDay(rule: AvailabilityRule, dateKey: string): boolean {
  return (
    rule.active &&
    getWeekdayFromDateKey(dateKey) === rule.weekday &&
    dateKey >= todayKey &&
    dateKey <= horizonKey &&
    (!rule.validFrom || dateKey >= rule.validFrom) &&
    (!rule.validUntil || dateKey <= rule.validUntil)
  )
}

function dayStatus(dateKey: string): DayStatus {
  const daySlots = manualSlots.value.filter((slot) => slot.slotKey.startsWith(`${dateKey}T`))

  if (bookings.value.some((item) => item.status === 'reserved' && item.slotKey.startsWith(`${dateKey}T`))) {
    return 'reserved'
  }
  if (daySlots.some((slot) => slot.blocked)) return 'blocked'
  if (daySlots.some((slot) => !slot.blocked)) return 'available'
  if (rules.value.some((rule) => ruleCoversDay(rule, dateKey))) return 'available'

  return 'empty'
}

function dayLabel(dateKey: string): string {
  const status = dayStatus(dateKey)
  const labels: Record<DayStatus, string> = {
    empty: 'sin horarios',
    available: 'con horarios disponibles',
    reserved: 'con citas reservadas',
    blocked: 'con horarios bloqueados'
  }

  return `${formatAppointmentDate(dateKey)}: ${labels[status]}`
}

interface DayHour {
  slotKey: string
  time: string
  status: 'available' | 'reserved' | 'blocked'
  durationMinutes: number
  serviceId: string | null
  blocked: boolean
}

/** Todas las horas del día: reglas vigentes, horarios sueltos y citas reservadas. */
function hoursForDay(dateKey: string): DayHour[] {
  const byKey = new Map<string, DayHour>()

  for (const rule of rules.value) {
    if (!ruleCoversDay(rule, dateKey)) continue
    const slotKey = `${dateKey}T${rule.startTime}`
    byKey.set(slotKey, {
      slotKey,
      time: rule.startTime,
      status: 'available',
      durationMinutes: rule.durationMinutes,
      serviceId: rule.serviceId,
      blocked: false
    })
  }

  for (const slot of manualSlots.value.filter((item) => item.slotKey.startsWith(`${dateKey}T`))) {
    const previous = byKey.get(slot.slotKey)
    byKey.set(slot.slotKey, {
      slotKey: slot.slotKey,
      time: slot.slotKey.slice(11),
      status: slot.blocked ? 'blocked' : (previous?.status ?? 'available'),
      durationMinutes: slot.durationMinutes,
      serviceId: slot.serviceId,
      blocked: slot.blocked
    })
  }

  for (const booking of bookings.value) {
    if (booking.status !== 'reserved' || !booking.slotKey.startsWith(`${dateKey}T`)) continue
    const previous = byKey.get(booking.slotKey)
    byKey.set(booking.slotKey, {
      slotKey: booking.slotKey,
      time: booking.slotKey.slice(11),
      status: previous?.blocked ? 'blocked' : 'reserved',
      durationMinutes: booking.durationMinutes,
      serviceId: booking.serviceId,
      blocked: previous?.blocked ?? false
    })
  }

  return [...byKey.values()].sort((left, right) => left.time.localeCompare(right.time))
}

const selectedDayHours = computed(() =>
  selectedDay.value ? hoursForDay(selectedDay.value) : []
)

function selectDay(dateKey: string) {
  selectedDay.value = dateKey
  slotForm.date = dateKey
}

async function changeBlock(slotKey: string, blocked: boolean, notice: string) {
  actionError.value = ''
  fieldErrors.value = {}
  saving.value = true

  try {
    await setSlotBlocked(slotKey, blocked)
    emit('notice', notice)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos actualizar el horario.')
  } finally {
    saving.value = false
  }
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

async function blockFrom(hour: DayHour) {
  const dateKey = selectedDay.value
  if (!dateKey) return

  const fromMinutes = timeToMinutes(hour.time)
  const untilMinutes = timeToMinutes(blockUntil.value)
  const step = hour.durationMinutes >= 15 ? hour.durationMinutes : 60

  if (untilMinutes <= fromMinutes) {
    actionError.value = 'La hora final debe ser posterior a la hora de inicio.'
    return
  }

  actionError.value = ''
  fieldErrors.value = {}
  saving.value = true

  try {
    const existing = new Map(selectedDayHours.value.map((item) => [item.time, item]))
    for (let minutes = fromMinutes; minutes <= untilMinutes; minutes += step) {
      const time = minutesToTime(minutes)
      const found = existing.get(time)
      if (found?.blocked) continue

      if (found) {
        await setSlotBlocked(found.slotKey, true)
      } else {
        await createManualSlot({
          date: dateKey,
          time,
          durationMinutes: step,
          serviceId: null
        })
        await setSlotBlocked(`${dateKey}T${time}`, true)
      }
    }

    emit('notice', `Horarios bloqueados de ${hour.time} a ${blockUntil.value}.`)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos bloquear los horarios.')
  } finally {
    saving.value = false
  }
}

async function blockExtraHour() {
  const dateKey = selectedDay.value
  const time = extraSlotForm.time
  if (!dateKey || !time) return

  actionError.value = ''
  fieldErrors.value = {}
  saving.value = true

  try {
    await createManualSlot({
      date: dateKey,
      time,
      durationMinutes: Number(extraSlotForm.durationMinutes),
      serviceId: null
    })
    await setSlotBlocked(`${dateKey}T${time}`, true)
    emit('notice', `Hora ${time} bloqueada.`)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos bloquear la hora.')
  } finally {
    saving.value = false
  }
}

function goToMonth(offset: number) {
  const next = shiftMonthKey(visibleMonth.value, offset)
  if (next < firstMonth || next > lastMonth) return
  visibleMonth.value = next
}

onMounted(load)

defineExpose({ load })
</script>

<template>
  <section class="rounded-2xl border border-border bg-surface p-5 md:p-6" aria-labelledby="availability-title">
    <h2 id="availability-title" class="font-display text-xl font-semibold text-accent">
      Disponibilidad
    </h2>
    <p class="mt-1 font-body text-sm text-text-muted">
      Configura las reglas semanales, los horarios individuales y los bloqueos.
    </p>

    <p
      v-if="loadError"
      class="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-sm text-red-500"
      role="alert"
      aria-live="polite"
    >
      {{ loadError }}
    </p>

    <p v-if="loading" class="mt-5 font-body text-sm text-text-muted" role="status" aria-live="polite">
      Cargando disponibilidad…
    </p>

    <template v-else>
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <form class="space-y-4 rounded-xl border border-border bg-surface-alt p-4" @submit.prevent="submitRule">
          <h3 class="font-display text-lg font-semibold text-accent">
            {{ editingRuleId ? 'Editar regla' : 'Nueva regla semanal' }}
          </h3>

          <fieldset class="space-y-2">
            <legend class="block font-body text-sm font-medium text-text">Días de la semana</legend>
            <div class="flex flex-wrap gap-x-4 gap-y-2">
              <label
                v-for="(label, value) in WEEKDAY_LABELS"
                :key="label"
                class="flex items-center gap-1.5 font-body text-sm capitalize text-text"
              >
                <input
                  v-model="ruleForm.weekdays"
                  type="checkbox"
                  :value="String(value)"
                  class="h-4 w-4 accent-accent"
                />
                {{ label }}
              </label>
            </div>
            <p class="font-body text-xs text-text-muted">Puedes elegir varios días para la misma regla.</p>
            <p v-if="errorFor('weekday')" class="font-body text-sm text-red-500" role="alert">
              {{ errorFor('weekday') }}
            </p>
          </fieldset>

          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="rule-start-time"
              v-model="ruleForm.startTime"
              label="Hora de inicio"
              type="time"
              required
              :error="errorFor('startTime')"
            />
            <BaseInput
              id="rule-duration"
              :model-value="String(ruleForm.durationMinutes)"
              label="Duración (minutos)"
              type="number"
              min="15"
              max="480"
              step="15"
              required
              :error="errorFor('durationMinutes')"
              @update:model-value="ruleForm.durationMinutes = Number($event)"
            />
          </div>

          <div class="space-y-2">
            <label for="rule-service" class="block font-body text-sm font-medium text-text">
              Servicio
            </label>
            <select
              id="rule-service"
              v-model="ruleForm.serviceId"
              class="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Cualquier servicio</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
            <p v-if="errorFor('serviceId')" class="font-body text-sm text-red-500" role="alert">
              {{ errorFor('serviceId') }}
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="rule-valid-from"
              v-model="ruleForm.validFrom"
              label="Vigente desde"
              type="date"
              :error="errorFor('validFrom')"
            />
            <BaseInput
              id="rule-valid-until"
              v-model="ruleForm.validUntil"
              label="Vigente hasta"
              type="date"
              :error="errorFor('validUntil')"
            />
          </div>

          <label class="flex items-center gap-2 font-body text-sm text-text">
            <input v-model="ruleForm.active" type="checkbox" class="h-4 w-4 accent-accent" />
            Regla activa
          </label>

          <div class="flex flex-wrap gap-3">
            <BaseButton type="submit" size="sm" :loading="saving">
              {{ editingRuleId ? 'GUARDAR REGLA' : 'CREAR REGLA' }}
            </BaseButton>
            <BaseButton v-if="editingRuleId" type="button" variant="ghost" size="sm" @click="resetRuleForm">
              Cancelar
            </BaseButton>
          </div>
        </form>

        <form class="space-y-4 rounded-xl border border-border bg-surface-alt p-4" @submit.prevent="submitSlot">
          <h3 class="font-display text-lg font-semibold text-accent">Horario individual</h3>

          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="slot-date"
              v-model="slotForm.date"
              label="Fecha"
              type="date"
              required
              :error="errorFor('date')"
            />
            <BaseInput
              id="slot-time"
              v-model="slotForm.time"
              label="Hora"
              type="time"
              required
              :error="errorFor('time')"
            />
          </div>

          <BaseInput
            id="slot-duration"
            :model-value="String(slotForm.durationMinutes)"
            label="Duración (minutos)"
            type="number"
            min="15"
            max="480"
            step="15"
            required
            :error="errorFor('durationMinutes')"
            @update:model-value="slotForm.durationMinutes = Number($event)"
          />

          <div class="space-y-2">
            <label for="slot-service" class="block font-body text-sm font-medium text-text">
              Servicio
            </label>
            <select
              id="slot-service"
              v-model="slotForm.serviceId"
              class="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Cualquier servicio</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
            <p v-if="errorFor('serviceId')" class="font-body text-sm text-red-500" role="alert">
              {{ errorFor('serviceId') }}
            </p>
          </div>

          <BaseButton type="submit" size="sm" :loading="saving">AGREGAR HORARIO</BaseButton>
        </form>
      </div>

      <p
        v-if="actionError"
        class="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-sm text-red-500"
        role="alert"
        aria-live="polite"
      >
        {{ actionError }}
      </p>

      <h3 class="mt-8 font-display text-lg font-semibold text-accent">Reglas publicadas</h3>
      <div v-if="rules.length" class="mt-3 overflow-x-auto">
        <table class="w-full border-collapse text-left font-body text-sm">
          <caption class="sr-only">Reglas de disponibilidad</caption>
          <thead>
            <tr class="border-b border-border text-text-muted">
              <th scope="col" class="px-2 py-2 font-semibold">Día</th>
              <th scope="col" class="px-2 py-2 font-semibold">Hora</th>
              <th scope="col" class="px-2 py-2 font-semibold">Duración</th>
              <th scope="col" class="px-2 py-2 font-semibold">Servicio</th>
              <th scope="col" class="px-2 py-2 font-semibold">Vigencia</th>
              <th scope="col" class="px-2 py-2 font-semibold">Estado</th>
              <th scope="col" class="px-2 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id" class="border-b border-border/60">
              <td class="px-2 py-2 capitalize text-text">{{ WEEKDAY_LABELS[rule.weekday] }}</td>
              <td class="px-2 py-2 text-text">{{ rule.startTime }}</td>
              <td class="px-2 py-2 text-text">{{ rule.durationMinutes }} min</td>
              <td class="px-2 py-2 text-text">{{ serviceName(rule.serviceId) }}</td>
              <td class="px-2 py-2 text-text-muted">
                {{ rule.validFrom ?? '—' }} a {{ rule.validUntil ?? 'sin límite' }}
              </td>
              <td class="px-2 py-2 text-text">{{ rule.active ? 'Activa' : 'Inactiva' }}</td>
              <td class="px-2 py-2">
                <div class="flex flex-wrap gap-2">
                  <BaseButton type="button" variant="secondary" size="sm" @click="editRule(rule)">
                    Editar
                  </BaseButton>
                  <BaseButton type="button" variant="ghost" size="sm" @click="removeRule(rule)">
                    Eliminar
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 font-body text-sm text-text-muted">Aún no hay reglas publicadas.</p>

      <h3 class="mt-8 font-display text-lg font-semibold text-accent">Horarios individuales</h3>
      <div v-if="manualSlots.length" class="mt-3 overflow-x-auto">
        <table class="w-full border-collapse text-left font-body text-sm">
          <caption class="sr-only">Horarios individuales y bloqueos</caption>
          <thead>
            <tr class="border-b border-border text-text-muted">
              <th scope="col" class="px-2 py-2 font-semibold">Fecha</th>
              <th scope="col" class="px-2 py-2 font-semibold">Hora</th>
              <th scope="col" class="px-2 py-2 font-semibold">Servicio</th>
              <th scope="col" class="px-2 py-2 font-semibold">Estado</th>
              <th scope="col" class="px-2 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in manualSlots" :key="slot.id" class="border-b border-border/60">
              <td class="px-2 py-2 text-text">{{ formatAppointmentDate(slot.slotKey) }}</td>
              <td class="px-2 py-2 text-text">{{ slot.slotKey.slice(11) }}</td>
              <td class="px-2 py-2 text-text">{{ serviceName(slot.serviceId) }}</td>
              <td class="px-2 py-2 text-text">{{ slot.blocked ? 'Bloqueado' : 'Disponible' }}</td>
              <td class="px-2 py-2">
                <div class="flex flex-wrap gap-2">
                  <BaseButton type="button" variant="secondary" size="sm" @click="toggleBlock(slot)">
                    {{ slot.blocked ? 'DESBLOQUEAR' : 'BLOQUEAR' }}
                  </BaseButton>
                  <BaseButton type="button" variant="ghost" size="sm" @click="removeSlot(slot)">
                    Eliminar
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 font-body text-sm text-text-muted">Aún no hay horarios individuales.</p>

      <div class="mt-8 border-t border-border pt-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-display text-lg font-semibold text-accent">Calendario de {{ monthLabel }}</h3>
          <div class="flex gap-2">
            <BaseButton type="button" variant="ghost" size="sm" :disabled="!canGoPrevious" aria-label="Mes anterior" @click="goToMonth(-1)">
              ←
            </BaseButton>
            <BaseButton type="button" variant="ghost" size="sm" :disabled="!canGoNext" aria-label="Mes siguiente" @click="goToMonth(1)">
              →
            </BaseButton>
          </div>
        </div>

        <p class="mt-3 font-body text-xs text-text-muted">
          Selecciona un día para revisar y bloquear sus horas.
        </p>

        <table class="mt-4 w-full table-fixed border-collapse text-center">
          <caption class="sr-only">Estado de la disponibilidad en {{ monthLabel }}</caption>
          <thead>
            <tr>
              <th
                v-for="weekday in CALENDAR_WEEKDAYS"
                :key="weekday"
                scope="col"
                class="py-2 font-body text-xs font-semibold uppercase text-text-muted"
              >
                {{ WEEKDAY_LABELS_SHORT[weekday] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(_week, weekIndex) in weekCount" :key="weekIndex">
              <td
                v-for="(dateKey, dayIndex) in calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7)"
                :key="dateKey ?? `empty-${weekIndex}-${dayIndex}`"
                class="p-1"
              >
                <button
                  v-if="dateKey"
                  type="button"
                  :disabled="dateKey < todayKey || dateKey > horizonKey"
                  :aria-label="dayLabel(dateKey)"
                  :aria-pressed="selectedDay === dateKey ? 'true' : undefined"
                  :class="[
                    'flex h-10 w-full items-center justify-center rounded-md border font-body text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    dateKey < todayKey || dateKey > horizonKey
                      ? 'cursor-not-allowed border-transparent text-text-muted/40'
                      : 'text-text hover:border-accent',
                    dayStatus(dateKey) === 'available' ? 'bg-accent-satin/15' : '',
                    dayStatus(dateKey) === 'reserved' ? 'bg-blue-500/20' : '',
                    dayStatus(dateKey) === 'blocked' ? 'bg-red-500/15' : '',
                    selectedDay === dateKey ? 'border-accent ring-1 ring-accent' : 'border-border/60'
                  ]"
                  @click="selectDay(dateKey)"
                >
                  {{ Number(dateKey.slice(-2)) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="mt-4 flex flex-wrap gap-4 font-body text-xs text-text-muted">
          <li class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-accent-satin/40" /> Con horarios</li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-blue-500/40" /> Reservados</li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-red-500/40" /> Bloqueados</li>
        </ul>

        <div v-if="selectedDay" class="mt-5 rounded-xl border border-border bg-surface-alt p-4">
          <h4 class="font-display text-base font-semibold text-accent">
            Horarios del {{ formatAppointmentDate(selectedDay) }}
          </h4>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <BaseInput
              id="block-until"
              v-model="blockUntil"
              label="Bloquear hasta"
              type="time"
              required
            />
            <p class="pb-2 font-body text-xs text-text-muted">
              Límite usado por «BLOQUEAR DESDE AQUÍ».
            </p>
          </div>

          <ul v-if="selectedDayHours.length" class="mt-3 space-y-2">
            <li
              v-for="hour in selectedDayHours"
              :key="hour.slotKey"
              class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div>
                <p class="font-body text-sm font-semibold text-text">
                  {{ hour.time }}
                  <span class="font-normal text-text-muted">· {{ serviceName(hour.serviceId) }}</span>
                </p>
                <p
                  class="font-body text-xs"
                  :class="
                    hour.status === 'blocked'
                      ? 'text-red-500'
                      : hour.status === 'reserved'
                        ? 'text-blue-500'
                        : 'text-text-muted'
                  "
                >
                  {{ hour.status === 'blocked' ? 'Bloqueado' : hour.status === 'reserved' ? 'Reservado' : 'Disponible' }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <BaseButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :aria-label="`${hour.blocked ? 'Desbloquear' : 'Bloquear'} hora ${hour.time}`"
                  @click="
                    changeBlock(
                      hour.slotKey,
                      !hour.blocked,
                      hour.blocked ? 'Horario desbloqueado.' : 'Horario bloqueado.'
                    )
                  "
                >
                  {{ hour.blocked ? 'DESBLOQUEAR' : 'BLOQUEAR' }}
                </BaseButton>
                <BaseButton
                  v-if="
                    !hour.blocked &&
                    selectedDayHours.some((item) => item.time > hour.time && !item.blocked)
                  "
                  type="button"
                  variant="ghost"
                  size="sm"
                  :aria-label="`Bloquear desde aquí: ${hour.time} hasta ${blockUntil}`"
                  @click="blockFrom(hour)"
                >
                  BLOQUEAR DESDE AQUÍ
                </BaseButton>
              </div>
            </li>
          </ul>
          <p v-else class="mt-3 font-body text-sm text-text-muted">
            Este día no tiene horas publicadas.
          </p>

          <form
            class="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
            @submit.prevent="blockExtraHour"
          >
            <BaseInput
              id="extra-hour-time"
              v-model="extraSlotForm.time"
              label="Bloquear hora adicional"
              type="time"
              required
            />
            <BaseInput
              id="extra-hour-duration"
              :model-value="String(extraSlotForm.durationMinutes)"
              label="Duración (min)"
              type="number"
              min="15"
              max="480"
              step="15"
              required
              @update:model-value="extraSlotForm.durationMinutes = Number($event)"
            />
            <BaseButton type="submit" size="sm">BLOQUEAR HORA</BaseButton>
          </form>
        </div>
        <p v-else class="mt-5 font-body text-sm text-text-muted">
          Selecciona un día del calendario para editar sus horarios.
        </p>
      </div>
    </template>
  </section>
</template>
