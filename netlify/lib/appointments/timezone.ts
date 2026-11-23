/**
 * Utilidades de fecha para citas.
 *
 * Todo se persiste en UTC (ISO) y se interpreta en America/Mexico_City.
 * Las conversiones usan Intl.DateTimeFormat para no depender de la zona del
 * servidor ni de librerías de fechas.
 */
import {
  APPOINTMENTS_FIRST_START,
  APPOINTMENTS_LAST_START
} from '../../../src/types/appointments'

export const APPOINTMENTS_TIME_ZONE = 'America/Mexico_City'

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const SLOT_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/
const DAY_MS = 24 * 60 * 60 * 1000
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let value = formatters.get(timeZone)
  if (!value) {
    value = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
    formatters.set(timeZone, value)
  }
  return value
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string): number {
  const value = parts.find((part) => part.type === type)?.value
  return Number(value ?? 0)
}

/** Componentes locales de un instante en la zona indicada. */
export function getZonedParts(instant: Date, timeZone = APPOINTMENTS_TIME_ZONE): ZonedParts {
  const parts = formatter(timeZone).formatToParts(instant)
  const hour = partValue(parts, 'hour') % 24
  return {
    year: partValue(parts, 'year'),
    month: partValue(parts, 'month'),
    day: partValue(parts, 'day'),
    hour,
    minute: partValue(parts, 'minute'),
    second: partValue(parts, 'second')
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/**
 * Hora de inicio publicable. Las reglas o excluidas antiguas fuera del
 * horario de la clínica (p. ej. 00:00) no generan horarios reservables.
 */
export function isBookableTime(value: unknown): value is string {
  return (
    isValidTimeString(value) &&
    value >= APPOINTMENTS_FIRST_START &&
    value <= APPOINTMENTS_LAST_START
  )
}

export interface SlotKeyParts {
  dateKey: string
  time: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** Valida y descompone una clave local YYYY-MM-DDTHH:mm. */
export function parseSlotKey(value: unknown): SlotKeyParts | null {
  if (typeof value !== 'string') return null
  const match = SLOT_KEY_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidDateKey(`${match[1]}-${match[2]}-${match[3]}`)) return null

  return {
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
    year,
    month,
    day,
    hour: Number(match[4]),
    minute: Number(match[5])
  }
}

export function makeSlotKey(dateKey: string, time: string): string | null {
  return isValidDateKey(dateKey) && isValidTimeString(time) ? `${dateKey}T${time}` : null
}

export function formatLocalDateKey(instant: Date, timeZone = APPOINTMENTS_TIME_ZONE): string {
  const parts = getZonedParts(instant, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function formatLocalSlotKey(instant: Date, timeZone = APPOINTMENTS_TIME_ZONE): string {
  const parts = getZonedParts(instant, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

export function formatLocalDateTime(instant: Date, timeZone = APPOINTMENTS_TIME_ZONE): string {
  const parts = getZonedParts(instant, timeZone)
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`
}

/** Día de la semana local: 0 domingo, 6 sábado. */
export function getWeekday(dateKey: string): number | null {
  if (!isValidDateKey(dateKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function addDaysToDateKey(dateKey: string, days: number): string | null {
  if (!isValidDateKey(dateKey) || !Number.isInteger(days)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return next.toISOString().slice(0, 10)
}

function wallTime(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

function offsetAt(instant: Date, timeZone: string): number {
  const seconds = Math.floor(instant.getTime() / 1000) * 1000
  return wallTime(getZonedParts(new Date(seconds), timeZone)) - seconds
}

function matchesWall(
  parts: ZonedParts,
  target: Pick<ZonedParts, 'year' | 'month' | 'day' | 'hour' | 'minute'>
): boolean {
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  )
}

/**
 * Convierte una hora local a un instante UTC.
 *
 * Prueba los offsets en vigor antes y después de la fecha: en una hora
 * ambigua elige la primera aparición y en una hora inexistente avanza al
 * primer instante válido (p. ej. 02:30 -> 03:30).
 */
export function zonedTimeToUtc(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day' | 'hour' | 'minute'>,
  timeZone = APPOINTMENTS_TIME_ZONE
): Date | null {
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (
    check.getUTCFullYear() !== parts.year ||
    check.getUTCMonth() !== parts.month - 1 ||
    check.getUTCDate() !== parts.day
  ) {
    return null
  }

  const offsets = [
    offsetAt(new Date(wall - DAY_MS), timeZone),
    offsetAt(new Date(wall + DAY_MS), timeZone)
  ].filter((offset, index, all) => all.indexOf(offset) === index)
  const candidates = offsets.map((offset) => wall - offset)
  const valid = candidates.filter((candidate) =>
    matchesWall(getZonedParts(new Date(candidate), timeZone), parts)
  )
  if (valid.length > 0) return new Date(Math.min(...valid))

  // Hora inexistente por un cambio de horario: devolver el primer instante válido.
  const scored = candidates
    .map((candidate) => {
      const local = getZonedParts(new Date(candidate), timeZone)
      return { candidate, delta: wallTime(local) - wall }
    })
    .sort((left, right) => {
      const leftScore = left.delta >= 0 ? left.delta : Number.MAX_SAFE_INTEGER
      const rightScore = right.delta >= 0 ? right.delta : Number.MAX_SAFE_INTEGER
      return leftScore - rightScore
    })
  return new Date(scored[0].candidate)
}

/** Convierte una clave local a ISO UTC; devuelve null si la hora no existe. */
export function slotKeyToUtc(slotKey: string, timeZone = APPOINTMENTS_TIME_ZONE): string | null {
  const parsed = parseSlotKey(slotKey)
  if (!parsed) return null
  const instant = zonedTimeToUtc(parsed, timeZone)
  if (!instant) return null
  return formatLocalSlotKey(instant, timeZone) === slotKey ? instant.toISOString() : null
}

export function isPastInstant(instant: Date, now: Date): boolean {
  return instant.getTime() <= now.getTime()
}
