<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CALENDAR_WEEKDAYS,
  WEEKDAY_LABELS_SHORT,
  formatAppointmentDate,
  formatAppointmentTime,
  formatMonthLabel,
  getLocalDateKey,
  getWeekdayFromDateKey,
  groupSlotsByDay,
  monthKeyFromDateKey,
  shiftMonthKey
} from '../../content/appointments'
import type { ScheduleSlot } from '../../types/appointments'
import BaseButton from '../ui/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    slots: ScheduleSlot[]
    loading?: boolean
    error?: string
    selectedSlotKey?: string | null
  }>(),
  {
    loading: false,
    error: '',
    selectedSlotKey: null
  }
)

const emit = defineEmits<{ select: [slot: ScheduleSlot] }>()

const todayKey = getLocalDateKey()
const visibleMonth = ref(monthKeyFromDateKey(todayKey))
const selectedDate = ref<string | null>(null)

const groups = computed(() => groupSlotsByDay(props.slots))
const availableMonths = computed(() => [
  ...new Set(groups.value.map((group) => monthKeyFromDateKey(group.date)))
])

const monthLabel = computed(() => {
  const [visibleYear, visibleMonthNumber] = visibleMonth.value.split('-').map(Number)
  return formatMonthLabel(visibleYear, visibleMonthNumber)
})
const firstWeekday = computed(() => getWeekdayFromDateKey(`${visibleMonth.value}-01`))
const offset = computed(() => (firstWeekday.value + 6) % 7)
const daysInMonth = computed(() => {
  const [visibleYear, visibleMonthNumber] = visibleMonth.value.split('-').map(Number)
  return new Date(Date.UTC(visibleYear, visibleMonthNumber, 0)).getUTCDate()
})

const monthDays = computed(() =>
  Array.from({ length: offset.value + daysInMonth.value }, (_, index) => {
    if (index < offset.value) return null
    const day = index - offset.value + 1
    return `${visibleMonth.value}-${String(day).padStart(2, '0')}`
  })
)

const weekCount = computed(() => Math.ceil(monthDays.value.length / 7))

const slotsByDate = computed(() => new Map(groups.value.map((group) => [group.date, group.slots])))
const selectedDaySlots = computed(() =>
  selectedDate.value ? (slotsByDate.value.get(selectedDate.value) ?? []) : []
)

const canGoPrevious = computed(() => {
  const previous = shiftMonthKey(visibleMonth.value, -1)
  return availableMonths.value.includes(previous)
})

const canGoNext = computed(() => {
  const next = shiftMonthKey(visibleMonth.value, 1)
  return availableMonths.value.includes(next)
})

const liveMessage = computed(() => {
  if (props.error) return props.error
  if (props.loading) return 'Cargando horarios disponibles…'
  if (!groups.value.length) return 'No hay horarios disponibles en los próximos 60 días.'

  const chosen = props.slots.find((slot) => slot.slotKey === props.selectedSlotKey)
  if (chosen) {
    return `Horario seleccionado: ${formatAppointmentDate(chosen.slotKey)} a las ${formatAppointmentTime(chosen.slotKey)}.`
  }

  return 'Elige una fecha y una hora disponible.'
})

function dayCount(dateKey: string): number {
  return slotsByDate.value.get(dateKey)?.length ?? 0
}

function dayLabel(dateKey: string): string {
  return `${formatAppointmentDate(dateKey)}, ${dayCount(dateKey)} ${dayCount(dateKey) === 1 ? 'horario' : 'horarios'}`
}

function isSelected(slot: ScheduleSlot): boolean {
  return slot.slotKey === props.selectedSlotKey
}

function goToMonth(offsetMonths: number) {
  const next = shiftMonthKey(visibleMonth.value, offsetMonths)
  if (!availableMonths.value.includes(next)) return

  visibleMonth.value = next
  const firstAvailable = groups.value.find(
    (group) => monthKeyFromDateKey(group.date) === next
  )
  selectedDate.value = firstAvailable?.date ?? null
}

function syncSelection() {
  const preferred = props.selectedSlotKey?.slice(0, 10)
  const preferredGroup = preferred ? groups.value.find((group) => group.date === preferred) : null

  if (preferredGroup) {
    selectedDate.value = preferredGroup.date
    visibleMonth.value = monthKeyFromDateKey(preferredGroup.date)
    return
  }

  if (!groups.value.length) {
    selectedDate.value = null
    return
  }

  if (!selectedDate.value || !slotsByDate.value.has(selectedDate.value)) {
    selectedDate.value = groups.value[0]?.date ?? null
  }

  if (!availableMonths.value.includes(visibleMonth.value)) {
    visibleMonth.value = monthKeyFromDateKey(selectedDate.value ?? groups.value[0]!.date)
  }
}

watch(() => props.slots, syncSelection, { immediate: true, deep: true })
watch(() => props.selectedSlotKey, syncSelection)
</script>

<template>
  <section class="rounded-2xl border border-border bg-surface p-5 md:p-6" aria-labelledby="scheduler-title">
    <h2 id="scheduler-title" class="font-display text-xl font-semibold text-accent">
      Elige fecha y hora
    </h2>
    <p class="mt-2 font-body text-sm text-text-muted">
      Selecciona un horario para agendar tu sesión. Si prefieres, puedes escribirnos sin elegir uno.
    </p>

    <p
      v-if="error"
      class="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-sm text-red-500"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="mt-5 flex items-center justify-between gap-3">
      <BaseButton
        type="button"
        variant="ghost"
        size="sm"
        :disabled="!canGoPrevious"
        aria-label="Mes anterior"
        @click="goToMonth(-1)"
      >
        ←
      </BaseButton>
      <p class="font-body text-sm font-semibold text-text" aria-live="polite">{{ monthLabel }}</p>
      <BaseButton
        type="button"
        variant="ghost"
        size="sm"
        :disabled="!canGoNext"
        aria-label="Mes siguiente"
        @click="goToMonth(1)"
      >
        →
      </BaseButton>
    </div>

    <div v-if="loading" class="mt-6" role="status" aria-live="polite">
      <p class="font-body text-sm text-text-muted">Cargando horarios…</p>
      <div class="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
        <span v-for="index in 35" :key="index" class="h-9 rounded bg-surface-alt" />
      </div>
    </div>

    <template v-else>
      <table class="mt-5 w-full table-fixed border-collapse text-center">
        <caption class="sr-only">Horarios disponibles para {{ monthLabel }}</caption>
        <thead>
          <tr>
            <th
              v-for="weekday in CALENDAR_WEEKDAYS"
              :key="weekday"
              scope="col"
              class="py-2 font-body text-xs font-semibold uppercase tracking-wide text-text-muted"
            >
              {{ WEEKDAY_LABELS_SHORT[weekday] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(_, weekIndex) in weekCount" :key="weekIndex">
            <td
              v-for="dateKey in monthDays.slice(weekIndex * 7, weekIndex * 7 + 7)"
              :key="dateKey ?? `empty-${weekIndex}`"
              class="p-1"
            >
              <button
                v-if="dateKey"
                type="button"
                :disabled="dayCount(dateKey) === 0"
                :aria-label="dayLabel(dateKey)"
                :aria-current="dateKey === todayKey ? 'date' : undefined"
                :aria-pressed="selectedDate === dateKey ? 'true' : undefined"
                :class="[
                  'flex h-10 w-full items-center justify-center rounded-md border font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  dayCount(dateKey) === 0
                    ? 'cursor-not-allowed border-transparent text-text-muted/40'
                    : selectedDate === dateKey
                      ? 'border-accent bg-accent-satin/20 font-semibold text-accent'
                      : 'border-border text-text hover:border-accent hover:text-accent'
                ]"
                @click="selectedDate = dateKey"
              >
                {{ Number(dateKey.slice(-2)) }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedDaySlots.length" class="mt-5 border-t border-border pt-5">
        <h3 class="font-body text-sm font-semibold text-text">
          Horarios del {{ formatAppointmentDate(selectedDate!) }}
        </h3>
        <ul class="mt-3 flex flex-wrap gap-2" :aria-label="`Horarios del ${formatAppointmentDate(selectedDate!)}`">
          <li v-for="slot in selectedDaySlots" :key="slot.slotKey">
            <BaseButton
              type="button"
              size="sm"
              :variant="isSelected(slot) ? 'primary' : 'secondary'"
              :aria-pressed="isSelected(slot) ? 'true' : 'false'"
              @click="emit('select', slot)"
            >
              {{ formatAppointmentTime(slot.slotKey) }}
            </BaseButton>
          </li>
        </ul>
      </div>

      <p v-else-if="!groups.length" class="mt-5 font-body text-sm text-text-muted">
        No hay horarios disponibles en este momento. Puedes enviarnos un mensaje y te responderemos
        pronto.
      </p>
      <p v-else class="mt-5 font-body text-sm text-text-muted">
        No hay horarios disponibles en este mes. Usa las flechas para ver otros meses.
      </p>
    </template>

    <p
      class="mt-4 min-h-5 font-body text-xs text-text-muted"
      :role="error ? undefined : 'status'"
      aria-live="polite"
    >
      {{ liveMessage }}
    </p>
  </section>
</template>
