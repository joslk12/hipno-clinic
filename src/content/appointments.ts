import type { ScheduleSlot } from '../types/appointments'

/** Zona horaria única usada por la agenda. */
export const APPOINTMENT_TIME_ZONE = 'America/Mexico_City'

/** Horizonte máximo de reserva, en días naturales. */
export const BOOKING_HORIZON_DAYS = 60

export interface SlotDayGroup {
  /** Fecha local en formato YYYY-MM-DD. */
  date: string
  slots: ScheduleSlot[]
}

interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/
const slotKeyPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APPOINTMENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: APPOINTMENT_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: APPOINTMENT_TIME_ZONE,
  day: 'numeric',
  month: 'long'
})

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: APPOINTMENT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const monthFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric'
})

export const WEEKDAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const

export const WEEKDAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

/** Orden de la cuadrícula mensual, empezando en lunes. */
export const CALENDAR_WEEKDAYS: ReadonlyArray<0 | 1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6, 0]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localParts(date: Date): LocalParts {
  const values = new Map<string, number>()

  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== 'literal') values.set(part.type, Number(part.value))
  }

  return {
    year: values.get('year') ?? date.getUTCFullYear(),
    month: values.get('month') ?? date.getUTCMonth() + 1,
    day: values.get('day') ?? date.getUTCDate(),
    hour: values.get('hour') ?? 0,
    minute: values.get('minute') ?? 0
  }
}

/**
 * Convierte una fecha y hora local de la zona de la clínica a un instante UTC.
 * Usa `Intl` en dos pasadas para respetar el horario de verano sin dependencias.
 */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  const result = new Date(target)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localParts(result)
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const difference = target - represented

    if (difference === 0) break
    result.setTime(result.getTime() + difference)
  }

  return result
}

/** Convierte una clave local, un ISO o una fecha a un objeto Date. */
export function toAppointmentDate(value: string | Date): Date {
  if (value instanceof Date) return value

  const local = slotKeyPattern.exec(value)
  if (local) {
    return zonedDateTimeToUtc(
      Number(local[1]),
      Number(local[2]),
      Number(local[3]),
      Number(local[4]),
      Number(local[5])
    )
  }

  const day = dateKeyPattern.exec(value)
  if (day) {
    return zonedDateTimeToUtc(Number(day[1]), Number(day[2]), Number(day[3]), 12, 0)
  }

  return new Date(value)
}

/** Devuelve la fecha local de la zona de la clínica como YYYY-MM-DD. */
export function getLocalDateKey(date: Date = new Date()): string {
  const parts = localParts(date)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

/** Fecha local actual más el horizonte de reserva, en formato YYYY-MM-DD. */
export function getBookingWindow(now: Date = new Date()): { from: string; to: string } {
  return {
    from: getLocalDateKey(now),
    to: addDaysToDateKey(getLocalDateKey(now), BOOKING_HORIZON_DAYS)
  }
}

/** Suma días naturales a una fecha local sin depender de la zona del servidor. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Día de la semana local (0 = domingo) de una fecha YYYY-MM-DD. */
export function getWeekdayFromDateKey(dateKey: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export function formatAppointmentDate(value: string | Date): string {
  const date = toAppointmentDate(value)
  if (Number.isNaN(date.getTime())) return ''

  return dateFormatter.format(date)
}

export function formatAppointmentShortDate(value: string | Date): string {
  const date = toAppointmentDate(value)
  if (Number.isNaN(date.getTime())) return ''

  return shortDateFormatter.format(date)
}

export function formatAppointmentTime(value: string | Date): string {
  const date = toAppointmentDate(value)
  if (Number.isNaN(date.getTime())) return ''

  return timeFormatter.format(date)
}

/** El mes llega en 1..12; Date.UTC lo interpreta en 0..11. */
export function formatMonthLabel(year: number, month: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

export function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7)
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

/** Agrupa horarios por día local y los ordena cronológicamente. */
export function groupSlotsByDay<T extends ScheduleSlot>(slots: readonly T[]): Array<{
  date: string
  slots: T[]
}> {
  const groups = new Map<string, T[]>()

  for (const slot of slots) {
    const date = slot.slotKey.slice(0, 10)
    const group = groups.get(date)
    if (group) group.push(slot)
    else groups.set(date, [slot])
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, daySlots]) => ({
      date,
      slots: [...daySlots].sort((left, right) => left.slotKey.localeCompare(right.slotKey))
    }))
}

export function isDateKeyValid(value: string): boolean {
  if (!dateKeyPattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}
