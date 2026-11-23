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
import { APPOINTMENTS_FIRST_START, APPOINTMENTS_LAST_START } from '../../types/appointments'
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
const selectedDay = ref<string | null>(null)
const blockUntil = ref('20:00')

type WeekdayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const OPENING_HOURS_MESSAGE = `La hora debe estar entre las ${APPOINTMENTS_FIRST_START} y las ${APPOINTMENTS_LAST_START}.`

/** Las reglas antiguas fuera de este rango (p. ej. 00:00) no se publican. */
function isBookableTime(value: string): boolean {
  return (
    TIME_PATTERN.test(value) &&
    value >= APPOINTMENTS_FIRST_START &&
    value <= APPOINTMENTS_LAST_START
  )
}

/** Cuadrícula día × hora: una celda por combinación de día y hora local. */
const gridStep = ref(60)
const gridTimes = computed(() => {
  const times: string[] = []
  const last = timeToMinutes(APPOINTMENTS_LAST_START)
  for (
    let minutes = timeToMinutes(APPOINTMENTS_FIRST_START);
    minutes <= last;
    minutes += gridStep.value
  ) {
    times.push(minutesToTime(minutes))
  }
  return times
})
/** Celdas marcadas en formato `weekday:HH:mm`. */
const gridSelection = ref<string[]>([])
/** Al editar un grupo solo se modifican sus reglas. */
const editingGroupIds = ref<string[]>([])

function emptyGridForm() {
  return {
    durationMinutes: 60,
    serviceId: '',
    validFrom: '',
    validUntil: '',
    active: true
  }
}

const gridForm = reactive(emptyGridForm())
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

function cellKey(weekday: WeekdayNumber, time: string): string {
  return `${weekday}:${time}`
}

function isSelected(weekday: WeekdayNumber, time: string): boolean {
  return gridSelection.value.includes(cellKey(weekday, time))
}

function toggleCell(weekday: WeekdayNumber, time: string) {
  const key = cellKey(weekday, time)
  gridSelection.value = isSelected(weekday, time)
    ? gridSelection.value.filter((item) => item !== key)
    : [...gridSelection.value, key]
}

function selectRow(time: string) {
  gridSelection.value = [
    ...new Set([...gridSelection.value, ...CALENDAR_WEEKDAYS.map((day) => cellKey(day, time))])
  ]
}

function selectColumn(weekday: WeekdayNumber) {
  gridSelection.value = [
    ...new Set([...gridSelection.value, ...gridTimes.value.map((time) => cellKey(weekday, time))])
  ]
}

function clearGrid() {
  gridSelection.value = []
  editingGroupIds.value = []
  actionError.value = ''
  fieldErrors.value = {}
}

function cancelGridEdit() {
  editingGroupIds.value = []
  actionError.value = ''
  fieldErrors.value = {}
  syncGridFromRules()
}

function bookableRules(): AvailabilityRule[] {
  return rules.value.filter((rule) => isBookableTime(rule.startTime))
}

const outOfRangeRuleList = computed(() =>
  rules.value.filter((rule) => !isBookableTime(rule.startTime))
)

const individualSlots = computed(() =>
  manualSlots.value.filter((slot) => slot.source === 'manual')
)

interface RuleGroup {
  key: string
  rules: AvailabilityRule[]
  weekdays: WeekdayNumber[]
  times: string[]
  durationMinutes: number
  serviceId: string | null
  validFrom: string | null
  validUntil: string | null
  active: boolean
}

function ruleGroupKey(rule: AvailabilityRule): string {
  return [
    rule.durationMinutes,
    rule.serviceId ?? '',
    rule.validFrom ?? '',
    rule.validUntil ?? '',
    String(rule.active)
  ].join('|')
}

/** Una fila por combinación de duración/servicio/vigencia/estado. */
const ruleGroups = computed<RuleGroup[]>(() => {
  const grouped = new Map<string, AvailabilityRule[]>()
  for (const rule of rules.value) {
    const key = ruleGroupKey(rule)
    grouped.set(key, [...(grouped.get(key) ?? []), rule])
  }
  return [...grouped.entries()].map(([key, list]) => ({
    key,
    rules: list,
    weekdays: [...new Set(list.map((rule) => rule.weekday))].sort((a, b) => a - b),
    times: [...new Set(list.map((rule) => rule.startTime))].sort(),
    durationMinutes: list[0]!.durationMinutes,
    serviceId: list[0]!.serviceId,
    validFrom: list[0]!.validFrom,
    validUntil: list[0]!.validUntil,
    active: list[0]!.active
  }))
})

function applyProfileToGrid(rulesToShow: AvailabilityRule[]) {
  gridSelection.value = rulesToShow.map((rule) => cellKey(rule.weekday, rule.startTime))
  const first = rulesToShow[0]
  Object.assign(
    gridForm,
    first
      ? {
          durationMinutes: first.durationMinutes,
          serviceId: first.serviceId ?? '',
          validFrom: first.validFrom ?? '',
          validUntil: first.validUntil ?? '',
          active: first.active
        }
      : emptyGridForm()
  )
}

function syncGridFromRules() {
  if (editingGroupIds.value.length) return
  applyProfileToGrid(bookableRules())
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

  syncGridFromRules()
}

function editGroup(group: RuleGroup) {
  actionError.value = ''
  fieldErrors.value = {}
  editingGroupIds.value = group.rules.map((rule) => rule.id)
  applyProfileToGrid(group.rules)
}

async function saveGrid() {
  actionError.value = ''
  fieldErrors.value = {}

  if (!gridSelection.value.length && !editingGroupIds.value.length) {
    fieldErrors.value = { grid: 'Selecciona al menos una hora del día.' }
    return
  }

  const scoped = editingGroupIds.value.length
    ? rules.value.filter((rule) => editingGroupIds.value.includes(rule.id))
    : bookableRules()
  const scopedIds = new Set(scoped.map((rule) => rule.id))
  const desired = new Set(gridSelection.value)
  const conflict = bookableRules().find(
    (rule) =>
      !scopedIds.has(rule.id) && desired.has(cellKey(rule.weekday, rule.startTime))
  )
  if (conflict) {
    fieldErrors.value = {
      grid: `La hora ${conflict.startTime} del día ${WEEKDAY_LABELS[conflict.weekday]} pertenece a otro grupo.`
    }
    return
  }

  const baseInput: Omit<AvailabilityRuleInput, 'weekday'> = {
    startTime: '',
    durationMinutes: Number(gridForm.durationMinutes),
    serviceId: gridForm.serviceId || null,
    validFrom: gridForm.validFrom || null,
    validUntil: gridForm.validUntil || null,
    active: gridForm.active
  }

  saving.value = true
  try {
    for (const rule of scoped) {
      if (!desired.has(cellKey(rule.weekday, rule.startTime))) {
        await deleteRule(rule.id)
      }
    }

    const existingByCell = new Map(
      scoped
        .filter((rule) => desired.has(cellKey(rule.weekday, rule.startTime)))
        .map((rule) => [cellKey(rule.weekday, rule.startTime), rule])
    )
    for (const cell of desired) {
      const separator = cell.indexOf(':')
      const weekday = Number(cell.slice(0, separator)) as Weekday
      const time = cell.slice(separator + 1)
      const input: AvailabilityRuleInput = { ...baseInput, startTime: time, weekday }
      const existing = existingByCell.get(cell)
      if (!existing) {
        await createRule(input)
        continue
      }
      const unchanged =
        existing.durationMinutes === input.durationMinutes &&
        existing.serviceId === input.serviceId &&
        existing.validFrom === input.validFrom &&
        existing.validUntil === input.validUntil &&
        existing.active === input.active
      if (!unchanged) await updateRule(existing.id, input)
    }

    editingGroupIds.value = []
    emit('notice', `Disponibilidad guardada (${desired.size} horarios).`)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos guardar la disponibilidad.')
  } finally {
    saving.value = false
  }
}

async function removeGroup(group: RuleGroup) {
  actionError.value = ''
  fieldErrors.value = {}

  try {
    for (const rule of group.rules) await deleteRule(rule.id)
    if (group.rules.some((rule) => editingGroupIds.value.includes(rule.id))) {
      editingGroupIds.value = []
    }
    emit('notice', `Grupo eliminado (${group.rules.length} reglas).`)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos eliminar las reglas.')
  }
}

async function removeOutOfRangeRules() {
  actionError.value = ''
  fieldErrors.value = {}
  const total = outOfRangeRuleList.value.length

  try {
    for (const rule of outOfRangeRuleList.value) await deleteRule(rule.id)
    emit('notice', `Se eliminaron ${total} reglas fuera de horario.`)
    await load()
  } catch (caught) {
    handleError(caught, 'No pudimos eliminar las reglas fuera de horario.')
  }
}
async function submitSlot() {
  actionError.value = ''
  fieldErrors.value = {}
  if (!isBookableTime(slotForm.time)) {
    fieldErrors.value = { time: OPENING_HOURS_MESSAGE }
    return
  }
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
  const prefix = `${dateKey}T`
  const daySlots = manualSlots.value.filter(
    (slot) => slot.slotKey.startsWith(prefix) && isBookableTime(slot.slotKey.slice(11))
  )

  if (
    bookings.value.some(
      (item) =>
        item.status === 'reserved' &&
        item.slotKey.startsWith(prefix) &&
        isBookableTime(item.slotKey.slice(11))
    )
  ) {
    return 'reserved'
  }
  if (daySlots.some((slot) => slot.blocked)) return 'blocked'
  if (daySlots.some((slot) => !slot.blocked)) return 'available'
  if (rules.value.some((rule) => ruleCoversDay(rule, dateKey) && isBookableTime(rule.startTime))) {
    return 'available'
  }

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
    if (!ruleCoversDay(rule, dateKey) || !isBookableTime(rule.startTime)) continue
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

  for (const slot of manualSlots.value.filter(
    (item) => item.slotKey.startsWith(`${dateKey}T`) && isBookableTime(item.slotKey.slice(11))
  )) {
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
    if (
      booking.status !== 'reserved' ||
      !booking.slotKey.startsWith(`${dateKey}T`) ||
      !isBookableTime(booking.slotKey.slice(11))
    ) {
      continue
    }
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

async function blockFrom(hour: DayHour) {
  const dateKey = selectedDay.value
  if (!dateKey) return

  const fromMinutes = Math.max(timeToMinutes(hour.time), timeToMinutes(APPOINTMENTS_FIRST_START))
  const untilMinutes = Math.min(
    timeToMinutes(blockUntil.value),
    timeToMinutes(APPOINTMENTS_LAST_START)
  )
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

    emit('notice', `Horarios bloqueados de ${minutesToTime(fromMinutes)} a ${minutesToTime(untilMinutes)}.`)
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
  if (!isBookableTime(time)) {
    fieldErrors.value = { time: OPENING_HOURS_MESSAGE }
    return
  }
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
      <form class="mt-6 rounded-xl border border-border bg-surface-alt p-4" @submit.prevent="saveGrid">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-display text-lg font-semibold text-accent">
              {{ editingGroupIds.length ? 'Editar grupo de horarios' : 'Disponibilidad semanal' }}
            </h3>
            <p class="mt-1 font-body text-sm text-text-muted">
              Marca las celdas de los días y horas que quieres publicar. Puedes seleccionar varias a la vez.
            </p>
          </div>
          <p class="font-body text-xs text-text-muted">
            Horario permitido: {{ APPOINTMENTS_FIRST_START }}–{{ APPOINTMENTS_LAST_START }}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <label class="flex items-center gap-2 font-body text-sm text-text">
            Intervalo
            <select
              v-model.number="gridStep"
              class="rounded-md border border-border bg-surface px-2 py-2 font-body text-sm text-text focus:border-accent focus:outline-none"
            >
              <option :value="30">30 minutos</option>
              <option :value="60">60 minutos</option>
            </select>
          </label>
          <BaseInput
            id="grid-duration"
            :model-value="String(gridForm.durationMinutes)"
            label="Duración (min)"
            type="number"
            min="15"
            max="480"
            step="15"
            required
            @update:model-value="gridForm.durationMinutes = Number($event)"
          />
          <div class="space-y-2">
            <label for="grid-service" class="block font-body text-sm font-medium text-text">Servicio</label>
            <select
              id="grid-service"
              v-model="gridForm.serviceId"
              class="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Cualquier servicio</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
          </div>
          <BaseInput
            id="grid-valid-from"
            v-model="gridForm.validFrom"
            label="Vigente desde"
            type="date"
          />
          <BaseInput
            id="grid-valid-until"
            v-model="gridForm.validUntil"
            label="Vigente hasta"
            type="date"
          />
          <label class="flex items-center gap-2 pb-2 font-body text-sm text-text">
            <input v-model="gridForm.active" type="checkbox" class="h-4 w-4 accent-accent" />
            Publicar
          </label>
        </div>

        <p v-if="errorFor('grid')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('grid') }}
        </p>
        <p v-if="errorFor('startTime')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('startTime') }}
        </p>
        <p v-if="errorFor('durationMinutes')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('durationMinutes') }}
        </p>
        <p v-if="errorFor('serviceId')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('serviceId') }}
        </p>
        <p v-if="errorFor('validFrom')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('validFrom') }}
        </p>
        <p v-if="errorFor('validUntil')" class="mt-3 font-body text-sm text-red-500" role="alert">
          {{ errorFor('validUntil') }}
        </p>

        <div class="mt-5 overflow-x-auto">
          <table class="w-full border-collapse text-center font-body text-sm">
            <caption class="sr-only">Cuadrícula de disponibilidad semanal por día y hora</caption>
            <thead>
              <tr class="border-b border-border text-text-muted">
                <th scope="col" class="px-2 py-2 text-left font-semibold">Hora</th>
                <th
                  v-for="weekday in CALENDAR_WEEKDAYS"
                  :key="weekday"
                  scope="col"
                  class="px-2 py-2 font-semibold capitalize"
                >
                  {{ WEEKDAY_LABELS_SHORT[weekday] }}
                  <button
                    type="button"
                    class="block mx-auto text-xs font-normal text-accent hover:underline"
                    :aria-label="`Seleccionar todas las horas del ${WEEKDAY_LABELS[weekday]}`"
                    @click="selectColumn(weekday)"
                  >
                    Todo
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="time in gridTimes" :key="time" class="border-b border-border/60">
                <th scope="row" class="px-2 py-1 text-left font-normal text-text">
                  {{ time }}
                  <button
                    type="button"
                    class="ml-2 text-xs text-accent hover:underline"
                    :aria-label="`Seleccionar ${time} en todos los días`"
                    @click="selectRow(time)"
                  >
                    Todos
                  </button>
                </th>
                <td v-for="weekday in CALENDAR_WEEKDAYS" :key="`${weekday}-${time}`" class="px-2 py-1">
                  <input
                    type="checkbox"
                    :checked="isSelected(weekday, time)"
                    :aria-label="`${WEEKDAY_LABELS[weekday]} ${time}`"
                    class="h-4 w-4 accent-accent"
                    @change="toggleCell(weekday, time)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-3 font-body text-xs text-text-muted">
          {{ gridSelection.length }} horarios seleccionados. Los cambios se aplican al guardar.
        </p>

        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton type="submit" size="sm" :loading="saving">GUARDAR DISPONIBILIDAD</BaseButton>
          <BaseButton type="button" variant="secondary" size="sm" @click="clearGrid">
            LIMPIAR SELECCIÓN
          </BaseButton>
          <BaseButton
            v-if="editingGroupIds.length"
            type="button"
            variant="ghost"
            size="sm"
            @click="cancelGridEdit"
          >
            Cancelar
          </BaseButton>
        </div>
      </form>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
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

      <div class="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="font-display text-lg font-semibold text-accent">Reglas publicadas</h3>
          <p class="mt-1 font-body text-sm text-text-muted">
            {{ rules.length }} reglas agrupadas en {{ ruleGroups.length }}
            {{ ruleGroups.length === 1 ? 'bloque' : 'bloques' }} con igual duración, servicio y vigencia.
          </p>
        </div>
      </div>

      <div
        v-if="outOfRangeRuleList.length"
        class="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
        role="alert"
      >
        <p class="font-body text-sm text-text">
          Hay {{ outOfRangeRuleList.length }}
          {{ outOfRangeRuleList.length === 1 ? 'regla antigua' : 'reglas antiguas' }} fuera del horario
          permitido ({{ APPOINTMENTS_FIRST_START }}–{{ APPOINTMENTS_LAST_START }}):
          {{ outOfRangeRuleList.map((rule) => `${WEEKDAY_LABELS[rule.weekday]} ${rule.startTime}`).join(', ') }}.
          No se muestran en el calendario público.
        </p>
        <BaseButton type="button" size="sm" class="mt-3" @click="removeOutOfRangeRules">
          ELIMINAR REGLAS FUERA DE HORARIO
        </BaseButton>
      </div>

      <div v-if="ruleGroups.length" class="mt-3 overflow-x-auto">
        <table class="w-full border-collapse text-left font-body text-sm">
          <caption class="sr-only">Bloques de reglas de disponibilidad</caption>
          <thead>
            <tr class="border-b border-border text-text-muted">
              <th scope="col" class="px-2 py-2 font-semibold">Días</th>
              <th scope="col" class="px-2 py-2 font-semibold">Horas</th>
              <th scope="col" class="px-2 py-2 font-semibold">Duración</th>
              <th scope="col" class="px-2 py-2 font-semibold">Servicio</th>
              <th scope="col" class="px-2 py-2 font-semibold">Vigencia</th>
              <th scope="col" class="px-2 py-2 font-semibold">Estado</th>
              <th scope="col" class="px-2 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in ruleGroups" :key="group.key" class="border-b border-border/60">
              <td class="px-2 py-2 text-text">
                <span v-for="weekday in group.weekdays" :key="weekday" class="mr-1">
                  {{ WEEKDAY_LABELS_SHORT[weekday] }}
                </span>
              </td>
              <td class="px-2 py-2 text-text" :title="group.times.join(', ')">
                {{ group.times.join(', ') }}
              </td>
              <td class="px-2 py-2 text-text">{{ group.durationMinutes }} min</td>
              <td class="px-2 py-2 text-text">{{ serviceName(group.serviceId) }}</td>
              <td class="px-2 py-2 text-text-muted">
                {{ group.validFrom ?? '—' }} a {{ group.validUntil ?? 'sin límite' }}
              </td>
              <td class="px-2 py-2 text-text">{{ group.active ? 'Activa' : 'Inactiva' }}</td>
              <td class="px-2 py-2">
                <div class="flex flex-wrap gap-2">
                  <BaseButton type="button" variant="secondary" size="sm" @click="editGroup(group)">
                    Editar
                  </BaseButton>
                  <BaseButton type="button" variant="ghost" size="sm" @click="removeGroup(group)">
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
      <p class="mt-1 font-body text-sm text-text-muted">
        Solo muestra los horarios que agregaste manualmente. Los generados por reglas se editan en el calendario.
      </p>
      <div v-if="individualSlots.length" class="mt-3 overflow-x-auto">
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
            <tr v-for="slot in individualSlots" :key="slot.id" class="border-b border-border/60">
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
