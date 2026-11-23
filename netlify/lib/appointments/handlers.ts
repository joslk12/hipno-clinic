import { randomUUID } from 'node:crypto'
import type {
  AdminAppointmentsResponse,
  AdminRulesResponse,
  AdminSlotsResponse,
  Appointment,
  AppointmentNotification,
  AvailabilityRule,
  ManualSlotRecord,
  ScheduleSlot
} from '../../../src/types/appointments'
import { hasValidSession, isAllowedOrigin } from '../blog/auth'
import { adminJson, errorResponse, methodNotAllowed, publicErrorResponse, publicJson, readJson } from '../blog/http'
import { createAppointmentNotifier, type AppointmentNotifier } from './notifications'
import { getAvailableSlots, getSlotDefinition } from './slots'
import type { AppointmentStore } from './store'
import {
  APPOINTMENTS_TIME_ZONE,
  isPastInstant,
  makeSlotKey,
  parseSlotKey,
  slotKeyToUtc
} from './timezone'
import {
  validateAppointmentInput,
  validateBlockedInput,
  validateManualSlotInput,
  validateRuleInput,
  validateSlotQuery
} from './validation'

export interface AppointmentHandlerDeps {
  store: AppointmentStore
  now?: () => Date
  randomId?: () => string
  sessionSecret?: string
  timeZone?: string
  notifier?: AppointmentNotifier
  databaseConfigured?: boolean
  horizonDays?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function now(deps: AppointmentHandlerDeps): Date {
  return (deps.now ?? (() => new Date()))()
}

function randomId(deps: AppointmentHandlerDeps): string {
  return (deps.randomId ?? randomUUID)()
}

function timeZone(deps: AppointmentHandlerDeps): string {
  return deps.timeZone ?? APPOINTMENTS_TIME_ZONE
}

function logError(scope: string, error: unknown) {
  console.error(`${scope}:`, error instanceof Error ? error.message : 'unknown error')
}

function databaseError(deps: AppointmentHandlerDeps, admin: boolean): Response | null {
  if (deps.databaseConfigured === false) {
    const message =
      'No hay base de datos configurada. Define DATABASE_URL (o NETLIFY_DATABASE_URL) en Netlify.'
    return admin ? errorResponse(503, message) : publicErrorResponse(503, message)
  }
  return null
}

function requireAdmin(request: Request, deps: AppointmentHandlerDeps): Response | null {
  if (!deps.sessionSecret) {
    return errorResponse(503, 'La administración de citas no está configurada.')
  }
  if (!hasValidSession(request, deps.sessionSecret)) {
    return errorResponse(401, 'Sesión no válida o expirada.')
  }
  if (!isAllowedOrigin(request)) {
    return errorResponse(403, 'Origen no permitido.')
  }
  return null
}

function queryValue(request: Request, name: string): string | null {
  const value = new URL(request.url).searchParams.get(name)?.trim()
  return value ? value : null
}

/* --------------------------- Horarios públicos -------------------------- */

export function createAppointmentSlotsHandler(deps: AppointmentHandlerDeps) {
  return async function appointmentSlotsHandler(request: Request): Promise<Response> {
    if (request.method !== 'GET') return methodNotAllowed('GET')

    const unavailable = databaseError(deps, false)
    if (unavailable) return unavailable

    const query = validateSlotQuery(new URL(request.url).searchParams)
    if (!query.ok) {
      return publicJson({ error: 'Revisa los parámetros de la consulta.', fields: query.fields }, 400)
    }

    try {
      const slots = await getAvailableSlots({
        store: deps.store,
        now: now(deps),
        timeZone: timeZone(deps),
        from: query.value.from,
        to: query.value.to,
        serviceId: query.value.serviceId,
        horizonDays: deps.horizonDays
      })
      return publicJson({ slots } satisfies { slots: ScheduleSlot[] })
    } catch (error) {
      logError('appointment slots handler error', error)
      return publicErrorResponse(500, 'No pudimos consultar los horarios disponibles.')
    }
  }
}

/* ------------------------------ Reservas -------------------------------- */

export function createCreateAppointmentHandler(deps: AppointmentHandlerDeps) {
  return async function createAppointmentHandler(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed('POST')

    const unavailable = databaseError(deps, false)
    if (unavailable) return unavailable

    const validation = validateAppointmentInput(await readJson(request))
    if (!validation.ok) {
      return publicJson({ error: 'Revisa los datos de la reserva.', fields: validation.fields }, 400)
    }

    const input = validation.value
    const current = now(deps)
    const startsAt = slotKeyToUtc(input.slotKey, timeZone(deps))
    if (!startsAt) {
      return publicJson(
        { error: 'Revisa los datos de la reserva.', fields: { slotKey: 'Selecciona un horario válido.' } },
        400
      )
    }
    if (isPastInstant(new Date(startsAt), current)) {
      return publicJson(
        { error: 'El horario ya pasó.', fields: { slotKey: 'El horario ya pasó. Elige otro.' } },
        400
      )
    }

    try {
      const [definition, storedSlot, reservedKeys] = await Promise.all([
        getSlotDefinition(deps.store, input.slotKey, current, timeZone(deps)),
        deps.store.getManualSlot(input.slotKey),
        deps.store.listReservedSlotKeys()
      ])

      if (storedSlot?.blocked) {
        return publicErrorResponse(409, 'El horario está bloqueado. Elige otro.')
      }
      if (reservedKeys.includes(input.slotKey)) {
        return publicErrorResponse(409, 'El horario ya está reservado. Elige otro.')
      }
      if (!definition) {
        return publicErrorResponse(409, 'El horario ya no está disponible. Elige otro.')
      }

      const timestamp = current.toISOString()
      const appointment: Appointment = {
        id: randomId(deps),
        slotKey: definition.slotKey,
        startsAt: definition.startsAt,
        durationMinutes: definition.durationMinutes,
        // La definición del horario manda: el cliente no puede cambiar el servicio.
        serviceId: definition.serviceId ?? input.serviceId ?? null,
        status: 'reserved',
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        createdAt: timestamp,
        updatedAt: timestamp,
        cancelledAt: null,
        notification: null
      }

      await deps.store.materializeSlot(definition, timestamp)
      const created = await deps.store.reserveAppointment(appointment)
      if (!created) {
        return publicErrorResponse(409, 'El horario ya está reservado. Elige otro.')
      }

      let notification: AppointmentNotification
      try {
        notification = await (deps.notifier ?? createAppointmentNotifier()).notify(created)
      } catch (error) {
        logError('appointment notification error', error)
        notification = {
          email: { ok: false, error: 'No se pudo enviar el aviso por correo.' },
          whatsapp: { ok: false, error: 'No se pudo enviar el aviso por WhatsApp.' }
        }
      }
      const withNotification: Appointment = { ...created, notification }
      try {
        await deps.store.saveNotification(created.id, notification)
      } catch (error) {
        // La notificación es best-effort: nunca se revierte una cita guardada.
        logError('appointment notification save error', error)
      }

      return publicJson({ appointment: withNotification }, 201)
    } catch (error) {
      logError('create appointment handler error', error)
      return publicErrorResponse(500, 'No pudimos guardar la cita. Inténtalo de nuevo.')
    }
  }
}

/* ------------------------- Reglas de disponibilidad --------------------- */

export function createAdminAppointmentRulesHandler(deps: AppointmentHandlerDeps) {
  return async function adminAppointmentRulesHandler(request: Request): Promise<Response> {
    const authError = requireAdmin(request, deps)
    if (authError) return authError
    const unavailable = databaseError(deps, true)
    if (unavailable) return unavailable

    try {
      const method = request.method
      if (method === 'GET') {
        const rules = await deps.store.listRules()
        return adminJson({ rules } satisfies AdminRulesResponse)
      }

      if (method === 'POST') {
        const body = await readJson(request)
        const rules = await deps.store.listRules()
        const validation = validateRuleInput(body, rules)
        if (!validation.ok) {
          return errorResponse(400, 'Revisa la regla de disponibilidad.', validation.fields)
        }

        const timestamp = now(deps).toISOString()
        const value = validation.value
        const rule: AvailabilityRule = {
          id: randomId(deps),
          weekday: value.weekday,
          startTime: value.startTime,
          durationMinutes: value.durationMinutes,
          serviceId: value.serviceId ?? null,
          validFrom: value.validFrom ?? null,
          validUntil: value.validUntil ?? null,
          active: value.active ?? true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
        await deps.store.saveRule(rule)
        return adminJson({ rule }, 201)
      }

      if (method === 'PATCH') {
        const id = queryValue(request, 'id')
        if (!id) return errorResponse(400, 'Falta el identificador de la regla.')

        const existing = await deps.store.getRule(id)
        if (!existing) return errorResponse(404, 'La regla no existe.')

        const body = await readJson(request)
        if (!isRecord(body)) return errorResponse(400, 'La solicitud no es válida.')

        const candidate = {
          weekday: body.weekday !== undefined ? body.weekday : existing.weekday,
          startTime: body.startTime !== undefined ? body.startTime : existing.startTime,
          durationMinutes:
            body.durationMinutes !== undefined ? body.durationMinutes : existing.durationMinutes,
          serviceId: body.serviceId !== undefined ? body.serviceId : existing.serviceId,
          validFrom: body.validFrom !== undefined ? body.validFrom : existing.validFrom,
          validUntil: body.validUntil !== undefined ? body.validUntil : existing.validUntil,
          active: body.active !== undefined ? body.active : existing.active
        }
        const rules = await deps.store.listRules()
        const validation = validateRuleInput(candidate, rules, id)
        if (!validation.ok) {
          return errorResponse(400, 'Revisa la regla de disponibilidad.', validation.fields)
        }

        const value = validation.value
        const rule: AvailabilityRule = {
          id: existing.id,
          weekday: value.weekday,
          startTime: value.startTime,
          durationMinutes: value.durationMinutes,
          serviceId: value.serviceId ?? null,
          validFrom: value.validFrom ?? null,
          validUntil: value.validUntil ?? null,
          active: value.active ?? true,
          createdAt: existing.createdAt,
          updatedAt: now(deps).toISOString()
        }
        await deps.store.saveRule(rule)
        return adminJson({ rule })
      }

      if (method === 'DELETE') {
        const id = queryValue(request, 'id')
        if (!id) return errorResponse(400, 'Falta el identificador de la regla.')
        const existing = await deps.store.getRule(id)
        if (!existing) return errorResponse(404, 'La regla no existe.')
        await deps.store.deleteRule(id)
        return adminJson({ ok: true })
      }

      return methodNotAllowed('GET, POST, PATCH, DELETE')
    } catch (error) {
      logError('admin appointment rules handler error', error)
      return errorResponse(500, 'No pudimos procesar las reglas de disponibilidad.')
    }
  }
}

/* ------------------------ Horarios individuales ------------------------- */

export function createAdminAppointmentSlotsHandler(deps: AppointmentHandlerDeps) {
  return async function adminAppointmentSlotsHandler(request: Request): Promise<Response> {
    const authError = requireAdmin(request, deps)
    if (authError) return authError
    const unavailable = databaseError(deps, true)
    if (unavailable) return unavailable

    try {
      const method = request.method
      if (method === 'GET') {
        const slots = await deps.store.listManualSlots()
        return adminJson({ slots } satisfies AdminSlotsResponse)
      }

      if (method === 'POST') {
        const validation = validateManualSlotInput(await readJson(request))
        if (!validation.ok) {
          return errorResponse(400, 'Revisa el horario.', validation.fields)
        }

        const { dateKey, time, durationMinutes, serviceId } = validation.value
        const slotKey = makeSlotKey(dateKey, time)
        const startsAt = slotKey ? slotKeyToUtc(slotKey, timeZone(deps)) : null
        if (!slotKey || !startsAt) {
          return errorResponse(400, 'Revisa el horario.', {
            time: 'La hora indicada no es válida en la zona horaria configurada.'
          })
        }
        if (isPastInstant(new Date(startsAt), now(deps))) {
          return errorResponse(400, 'Revisa el horario.', {
            date: 'No se puede crear un horario en el pasado.'
          })
        }

        const timestamp = now(deps).toISOString()
        const slot: ManualSlotRecord = {
          id: slotKey,
          slotKey,
          startsAt,
          durationMinutes,
          serviceId,
          blocked: false,
          source: 'manual',
          ruleId: null
        }
        await deps.store.saveManualSlot(slot, timestamp)
        return adminJson({ slot }, 201)
      }

      if (method === 'PATCH') {
        const slotKey = queryValue(request, 'slotKey')
        if (!slotKey || !parseSlotKey(slotKey)) {
          return errorResponse(400, 'Indica un horario válido.')
        }
        const validation = validateBlockedInput(await readJson(request))
        if (!validation.ok) {
          return errorResponse(400, 'Revisa el horario.', validation.fields)
        }

        const current = now(deps)
        const existing = await deps.store.getManualSlot(slotKey)
        const definition =
          existing ??
          (await getSlotDefinition(deps.store, slotKey, current, timeZone(deps), true))
        if (!definition) return errorResponse(404, 'El horario no existe.')

        const startsAt = slotKeyToUtc(slotKey, timeZone(deps)) ?? definition.startsAt
        if (!validation.value && isPastInstant(new Date(startsAt), current)) {
          return errorResponse(400, 'No se puede desbloquear un horario que ya pasó.')
        }

        const saved = await deps.store.setSlotBlocked(
          { ...definition, startsAt },
          validation.value,
          current.toISOString()
        )
        return adminJson({ slot: saved })
      }

      if (method === 'DELETE') {
        const slotKey = queryValue(request, 'slotKey')
        if (!slotKey) return errorResponse(400, 'Indica el horario que deseas eliminar.')

        const existing = await deps.store.getManualSlot(slotKey)
        if (!existing) return errorResponse(404, 'El horario no existe.')
        const reservedKeys = await deps.store.listReservedSlotKeys()
        if (reservedKeys.includes(slotKey)) {
          return errorResponse(409, 'El horario tiene una reserva activa. Cancela la cita antes de eliminarlo.')
        }

        await deps.store.deleteManualSlot(slotKey)
        return adminJson({ ok: true })
      }

      return methodNotAllowed('GET, POST, PATCH, DELETE')
    } catch (error) {
      logError('admin appointment slots handler error', error)
      return errorResponse(500, 'No pudimos procesar los horarios.')
    }
  }
}

/* -------------------------------- Citas --------------------------------- */

export function createAdminAppointmentsHandler(deps: AppointmentHandlerDeps) {
  return async function adminAppointmentsHandler(request: Request): Promise<Response> {
    const authError = requireAdmin(request, deps)
    if (authError) return authError
    const unavailable = databaseError(deps, true)
    if (unavailable) return unavailable

    try {
      if (request.method === 'GET') {
        const appointments = await deps.store.listAppointments()
        return adminJson({ appointments } satisfies AdminAppointmentsResponse)
      }

      if (request.method === 'PATCH') {
        const id = queryValue(request, 'id')
        if (!id) return errorResponse(400, 'Falta el identificador de la cita.')

        const appointment = await deps.store.getAppointment(id)
        if (!appointment) return errorResponse(404, 'La cita no existe.')
        if (appointment.status !== 'reserved') {
          return errorResponse(409, 'La cita ya está cancelada.')
        }
        if (isPastInstant(new Date(appointment.startsAt), now(deps))) {
          return errorResponse(400, 'No se puede cancelar una cita cuya hora ya pasó.')
        }

        const cancelled = await deps.store.cancelAppointment(id, now(deps).toISOString())
        if (!cancelled) return errorResponse(409, 'La cita ya no está disponible para cancelar.')
        return adminJson({ appointment: cancelled })
      }

      return methodNotAllowed('GET, PATCH')
    } catch (error) {
      logError('admin appointments handler error', error)
      return errorResponse(500, 'No pudimos procesar las citas.')
    }
  }
}
