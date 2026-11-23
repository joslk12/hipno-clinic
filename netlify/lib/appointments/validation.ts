import {
  APPOINTMENTS_FIRST_START,
  APPOINTMENTS_LAST_START
} from '../../../src/types/appointments'
import type {
  AppointmentInput,
  AvailabilityRule,
  AvailabilityRuleInput,
  Weekday
} from '../../../src/types/appointments'
import { isValidDateKey, isBookableTime, parseSlotKey } from './timezone'

export type FieldErrors = Record<string, string>

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fields: FieldErrors }

export type NormalizedRuleInput = AvailabilityRuleInput

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalText(value: unknown, field: string, fields: FieldErrors): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') {
    fields[field] = 'Escribe un valor de texto válido.'
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed.length > 120) {
    fields[field] = 'El valor es demasiado largo.'
    return undefined
  }
  return trimmed || null
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const OPENING_HOURS_MESSAGE = `La hora debe estar entre las ${APPOINTMENTS_FIRST_START} y las ${APPOINTMENTS_LAST_START}.`

function validityRangesOverlap(
  leftFrom: string | null,
  leftUntil: string | null,
  rightFrom: string | null,
  rightUntil: string | null
): boolean {
  if (leftUntil && rightFrom && leftUntil < rightFrom) return false
  if (rightUntil && leftFrom && rightUntil < leftFrom) return false
  return true
}

function timesOverlap(
  startTime: string,
  durationMinutes: number,
  otherStart: string,
  otherDuration: number
): boolean {
  const start = timeToMinutes(startTime)
  const end = start + durationMinutes
  const otherStartMinutes = timeToMinutes(otherStart)
  const otherEnd = otherStartMinutes + otherDuration
  return start < otherEnd && otherStartMinutes < end
}

/** Valida una regla completa, incluido el solapamiento con las demás reglas activas. */
export function validateRuleInput(
  input: unknown,
  rules: AvailabilityRule[] = [],
  excludeId?: string
): ValidationResult<NormalizedRuleInput> {
  if (!isRecord(input)) {
    return { ok: false, fields: { form: 'La solicitud no es válida.' } }
  }

  const fields: FieldErrors = {}
  const weekday = input.weekday
  if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    fields.weekday = 'Elige un día de la semana válido.'
  }

  const startTime = input.startTime
  if (!isBookableTime(startTime)) {
    fields.startTime = OPENING_HOURS_MESSAGE
  }

  const durationMinutes = input.durationMinutes
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 480
  ) {
    fields.durationMinutes = 'La duración debe estar entre 15 y 480 minutos.'
  }

  const serviceId = optionalText(input.serviceId, 'serviceId', fields)
  const validFrom = optionalText(input.validFrom, 'validFrom', fields)
  const validUntil = optionalText(input.validUntil, 'validUntil', fields)
  if (validFrom !== undefined && validFrom !== null && !isValidDateKey(validFrom)) {
    fields.validFrom = 'Escribe una fecha válida en formato AAAA-MM-DD.'
  }
  if (validUntil !== undefined && validUntil !== null && !isValidDateKey(validUntil)) {
    fields.validUntil = 'Escribe una fecha válida en formato AAAA-MM-DD.'
  }
  if (
    validFrom &&
    validUntil &&
    isValidDateKey(validFrom) &&
    isValidDateKey(validUntil) &&
    validFrom > validUntil
  ) {
    fields.validUntil = 'La fecha final debe ser igual o posterior a la inicial.'
  }

  const active = input.active === undefined ? true : input.active
  if (typeof active !== 'boolean') {
    fields.active = 'Indica si la regla está activa.'
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields }

  const value: NormalizedRuleInput = {
    weekday: weekday as Weekday,
    startTime: startTime as string,
    durationMinutes: durationMinutes as number,
    serviceId: serviceId ?? null,
    validFrom: validFrom ?? null,
    validUntil: validUntil ?? null,
    active: active as boolean
  }

  if (value.active) {
    const overlap = rules.find(
      (rule) =>
        rule.id !== excludeId &&
        rule.active &&
        rule.weekday === value.weekday &&
        validityRangesOverlap(
          value.validFrom ?? null,
          value.validUntil ?? null,
          rule.validFrom,
          rule.validUntil
        ) &&
        timesOverlap(
          value.startTime,
          value.durationMinutes,
          rule.startTime,
          rule.durationMinutes
        )
    )
    if (overlap) {
      return {
        ok: false,
        fields: {
          overlap: `Se solapa con la regla de las ${overlap.startTime} del día ${overlap.weekday}.`
        }
      }
    }
  }

  return { ok: true, value }
}

export interface ValidManualSlotInput {
  dateKey: string
  time: string
  durationMinutes: number
  serviceId: string | null
}

export function validateManualSlotInput(input: unknown): ValidationResult<ValidManualSlotInput> {
  if (!isRecord(input)) {
    return { ok: false, fields: { form: 'La solicitud no es válida.' } }
  }

  const fields: FieldErrors = {}
  const dateKey = input.date
  if (!isValidDateKey(dateKey)) {
    fields.date = 'Escribe una fecha válida en formato AAAA-MM-DD.'
  }
  if (!isBookableTime(input.time)) {
    fields.time = OPENING_HOURS_MESSAGE
  }
  const durationMinutes = input.durationMinutes
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 480
  ) {
    fields.durationMinutes = 'La duración debe estar entre 15 y 480 minutos.'
  }
  const serviceId = optionalText(input.serviceId, 'serviceId', fields)

  if (Object.keys(fields).length > 0) return { ok: false, fields }
  return {
    ok: true,
    value: {
      dateKey: dateKey as string,
      time: input.time as string,
      durationMinutes: durationMinutes as number,
      serviceId: serviceId ?? null
    }
  }
}

export function validateBlockedInput(input: unknown): ValidationResult<boolean> {
  if (!isRecord(input) || typeof input.blocked !== 'boolean') {
    return { ok: false, fields: { blocked: 'Indica si el horario está bloqueado.' } }
  }
  return { ok: true, value: input.blocked }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateAppointmentInput(input: unknown): ValidationResult<AppointmentInput> {
  if (!isRecord(input)) {
    return { ok: false, fields: { form: 'La solicitud no es válida.' } }
  }

  const fields: FieldErrors = {}
  const slotKey = typeof input.slotKey === 'string' ? input.slotKey.trim() : ''
  if (!parseSlotKey(slotKey)) {
    fields.slotKey = 'Selecciona un horario válido.'
  }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (name.length < 2 || name.length > 120) {
    fields.name = 'Escribe tu nombre (entre 2 y 120 caracteres).'
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  if (!EMAIL_PATTERN.test(email)) {
    fields.email = 'Escribe un correo electrónico válido.'
  }

  const phone = input.phone === undefined || input.phone === null ? '' : input.phone
  if (typeof phone !== 'string' || phone.trim().length > 40) {
    fields.phone = 'Escribe un teléfono válido.'
  }

  const message = input.message === undefined || input.message === null ? '' : input.message
  if (typeof message !== 'string' || message.length > 2000) {
    fields.message = 'El mensaje es demasiado largo.'
  }

  const serviceId = optionalText(input.serviceId, 'serviceId', fields)

  if (Object.keys(fields).length > 0) return { ok: false, fields }
  return {
    ok: true,
    value: {
      slotKey,
      name,
      email,
      phone: typeof phone === 'string' ? phone.trim() : '',
      message: typeof message === 'string' ? message.trim() : '',
      serviceId: serviceId ?? null
    }
  }
}

export interface ValidSlotQuery {
  from?: string
  to?: string
  serviceId: string | null
}

export function validateSlotQuery(params: URLSearchParams): ValidationResult<ValidSlotQuery> {
  const fields: FieldErrors = {}
  const rawFrom = params.get('from')
  const rawTo = params.get('to')
  const from = rawFrom === null || rawFrom.trim() === '' ? undefined : rawFrom.trim()
  const to = rawTo === null || rawTo.trim() === '' ? undefined : rawTo.trim()

  if (from !== undefined && !isValidDateKey(from)) {
    fields.from = 'Escribe una fecha inicial válida en formato AAAA-MM-DD.'
  }
  if (to !== undefined && !isValidDateKey(to)) {
    fields.to = 'Escribe una fecha final válida en formato AAAA-MM-DD.'
  }
  if (from && to && isValidDateKey(from) && isValidDateKey(to) && from > to) {
    fields.to = 'La fecha final debe ser igual o posterior a la inicial.'
  }

  const rawServiceId = params.get('serviceId')
  const serviceId = rawServiceId?.trim() || null
  if (serviceId && serviceId.length > 120) {
    fields.serviceId = 'El identificador del servicio no es válido.'
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields }
  return { ok: true, value: { from, to, serviceId } }
}
