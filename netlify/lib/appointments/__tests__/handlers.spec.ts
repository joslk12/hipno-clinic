import { describe, expect, it } from 'vitest'
import { createSessionToken } from '../../blog/auth'
import type { AppointmentHandlerDeps } from '../handlers'
import {
  createAdminAppointmentRulesHandler,
  createAdminAppointmentSlotsHandler,
  createAdminAppointmentsHandler,
  createAppointmentSlotsHandler,
  createCreateAppointmentHandler
} from '../handlers'
import type { AppointmentNotifier } from '../notifications'
import { createMemoryAppointmentStore } from '../store'
import { appointment, fixedNow, rule, slotRecord } from './fixtures'

const SESSION_SECRET = 'secreto-de-prueba'
const token = createSessionToken(SESSION_SECRET)

const okNotifier: AppointmentNotifier = {
  emailConfigured: true,
  whatsappConfigured: false,
  async notify() {
    return { email: { ok: true }, whatsapp: { ok: false, error: 'Sin configurar' } }
  }
}

function deps(
  store: ReturnType<typeof createMemoryAppointmentStore>,
  overrides: Partial<AppointmentHandlerDeps> = {}
): AppointmentHandlerDeps {
  return {
    store,
    now: fixedNow,
    randomId: () => 'cita-nueva',
    sessionSecret: SESSION_SECRET,
    notifier: okNotifier,
    ...overrides
  }
}

function publicRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://sitio.test${path}`, init)
}

function adminRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cookie', `oc_admin_session=${token}`)
  headers.set('origin', 'https://sitio.test')
  return new Request(`https://sitio.test${path}`, { ...init, headers })
}

function jsonRequest(path: string, method: string, body: unknown, admin = false) {
  const init: RequestInit = {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }
  return admin ? adminRequest(path, init) : publicRequest(path, init)
}

// Las respuestas son JSON heterogéneo; en tests se accede a campos anidados sin tiparlos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestJsonBody = Record<string, any>

async function json(response: Response): Promise<TestJsonBody> {
  return (await response.json()) as TestJsonBody
}

describe('handlers públicos de citas', () => {
  it('devuelve horarios disponibles sin datos privados', async () => {
    const store = createMemoryAppointmentStore({
      rules: [rule({ validUntil: '2026-03-02' })],
      appointments: [
        appointment({
          id: 'reserva',
          slotKey: '2026-03-02T10:00',
          startsAt: '2026-03-02T16:00:00.000Z',
          email: 'privado@example.com'
        })
      ]
    })
    const handler = createAppointmentSlotsHandler(deps(store))
    const response = await handler(
      publicRequest('/api/appointments/slots?from=2026-03-02&to=2026-03-09')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await json(response)
    expect(body.slots).toEqual([])
    expect(JSON.stringify(body)).not.toContain('privado@example.com')
  })

  it('valida parámetros y responde 503 sin base de datos', async () => {
    const store = createMemoryAppointmentStore()
    const handler = createAppointmentSlotsHandler(deps(store))
    const invalid = await handler(publicRequest('/api/appointments/slots?from=2026-02-30'))
    expect(invalid.status).toBe(400)
    expect((await json(invalid)).fields.from).toBeTruthy()

    const offline = createAppointmentSlotsHandler(deps(store, { databaseConfigured: false }))
    const response = await offline(publicRequest('/api/appointments/slots'))
    expect(response.status).toBe(503)
    expect((await json(response)).error).toContain('DATABASE_URL')
  })

  it('reserva una vez, rechaza duplicados y conserva la cita si falla el aviso', async () => {
    const store = createMemoryAppointmentStore({ rules: [rule()] })
    const handler = createCreateAppointmentHandler(deps(store))
    const input = {
      slotKey: '2026-03-02T10:00',
      name: 'Ana Ruiz',
      email: 'ANA@Example.com',
      phone: '5512345678',
      message: 'Hola'
    }

    const created = await handler(
      jsonRequest('/api/appointments', 'POST', input)
    )
    expect(created.status).toBe(201)
    const body = await json(created)
    expect(body.appointment).toMatchObject({
      status: 'reserved',
      slotKey: '2026-03-02T10:00',
      email: 'ana@example.com',
      startsAt: '2026-03-02T16:00:00.000Z'
    })
    expect(body.appointment.notification.email.ok).toBe(true)

    const duplicate = await handler(jsonRequest('/api/appointments', 'POST', input))
    expect(duplicate.status).toBe(409)
    expect(await store.listAppointments()).toHaveLength(1)

    const invalid = await handler(
      jsonRequest('/api/appointments', 'POST', { ...input, slotKey: '2026-03-03T10:00', email: 'malo' })
    )
    expect(invalid.status).toBe(400)
    expect((await json(invalid)).fields.email).toBeTruthy()

    const past = await handler(
      jsonRequest('/api/appointments', 'POST', { ...input, slotKey: '2026-02-23T10:00' })
    )
    expect(past.status).toBe(400)
  })

  it('no revierte la cita cuando el notificador lanza un error', async () => {
    const store = createMemoryAppointmentStore({ rules: [rule()] })
    const failingNotifier: AppointmentNotifier = {
      emailConfigured: true,
      whatsappConfigured: true,
      async notify() {
        throw new Error('proveedor caído')
      }
    }
    const handler = createCreateAppointmentHandler(deps(store, { notifier: failingNotifier }))
    const response = await handler(
      jsonRequest('/api/appointments', 'POST', {
        slotKey: '2026-03-02T10:00',
        name: 'Ana Ruiz',
        email: 'ana@example.com',
        phone: '5512345678',
        message: ''
      })
    )
    expect(response.status).toBe(201)
    expect((await json(response)).appointment.notification.email.ok).toBe(false)
    expect(await store.listAppointments()).toHaveLength(1)
  })
})

describe('handlers administrativos de citas', () => {
  it('exige sesión, origen válido y base de datos', async () => {
    const store = createMemoryAppointmentStore()
    const handler = createAdminAppointmentRulesHandler(deps(store))

    const anonymous = await handler(publicRequest('/api/admin/appointments/rules'))
    expect(anonymous.status).toBe(401)

    const wrongOrigin = new Request('https://sitio.test/api/admin/appointments/rules', {
      headers: {
        cookie: `oc_admin_session=${token}`,
        origin: 'https://otro.test'
      }
    })
    const forbidden = await handler(wrongOrigin)
    expect(forbidden.status).toBe(403)

    const offline = createAdminAppointmentRulesHandler(deps(store, { databaseConfigured: false }))
    expect((await offline(adminRequest('/api/admin/appointments/rules'))).status).toBe(503)
  })

  it('crea, edita y elimina reglas con validación de solapamiento', async () => {
    const store = createMemoryAppointmentStore({ rules: [rule()] })
    const handler = createAdminAppointmentRulesHandler(deps(store))

    const listed = await handler(adminRequest('/api/admin/appointments/rules'))
    expect(listed.status).toBe(200)
    expect((await json(listed)).rules).toHaveLength(1)

    const overlap = await handler(
      jsonRequest(
        '/api/admin/appointments/rules',
        'POST',
        { weekday: 1, startTime: '10:30', durationMinutes: 60 },
        true
      )
    )
    expect(overlap.status).toBe(400)
    expect((await json(overlap)).fields.overlap).toBeTruthy()

    const created = await handler(
      jsonRequest(
        '/api/admin/appointments/rules',
        'POST',
        { weekday: 1, startTime: '12:00', durationMinutes: 60, active: true },
        true
      )
    )
    expect(created.status).toBe(201)
    const ruleId = (await json(created)).rule.id as string

    const patched = await handler(
      jsonRequest(
        `/api/admin/appointments/rules?id=${ruleId}`,
        'PATCH',
        { durationMinutes: 90 },
        true
      )
    )
    expect(patched.status).toBe(200)
    expect((await json(patched)).rule.durationMinutes).toBe(90)

    const removed = await handler(
      adminRequest(`/api/admin/appointments/rules?id=${ruleId}`, { method: 'DELETE' })
    )
    expect(removed.status).toBe(200)
    expect(await json(removed)).toEqual({ ok: true })
  })

  it('bloquea horarios generados y rechaza borrar horarios con reserva', async () => {
    const store = createMemoryAppointmentStore({
      rules: [rule()],
      slots: [
        slotRecord({
          id: 'manual-1',
          slotKey: '2026-03-04T10:00',
          startsAt: '2026-03-04T16:00:00.000Z',
          durationMinutes: 45
        })
      ],
      appointments: [
        appointment({
          id: 'reserva-manual',
          slotKey: '2026-03-04T10:00',
          startsAt: '2026-03-04T16:00:00.000Z'
        })
      ]
    })
    const slotsHandler = createAdminAppointmentSlotsHandler(deps(store))
    const publicHandler = createAppointmentSlotsHandler(deps(store))

    const blocked = await slotsHandler(
      jsonRequest(
        '/api/admin/appointments/slots?slotKey=2026-03-02T10:00',
        'PATCH',
        { blocked: true },
        true
      )
    )
    expect(blocked.status).toBe(200)
    expect((await json(blocked)).slot.blocked).toBe(true)

    const available = await json(
      await publicHandler(publicRequest('/api/appointments/slots?from=2026-03-02&to=2026-03-09'))
    )
    expect(available.slots.map((slot: { slotKey: string }) => slot.slotKey)).not.toContain(
      '2026-03-02T10:00'
    )

    const reservedDelete = await slotsHandler(
      adminRequest('/api/admin/appointments/slots?slotKey=2026-03-04T10:00', { method: 'DELETE' })
    )
    expect(reservedDelete.status).toBe(409)

    const created = await slotsHandler(
      jsonRequest(
        '/api/admin/appointments/slots',
        'POST',
        { date: '2026-03-05', time: '11:00', durationMinutes: 30 },
        true
      )
    )
    expect(created.status).toBe(201)

    const deleted = await slotsHandler(
      adminRequest('/api/admin/appointments/slots?slotKey=2026-03-05T11:00', { method: 'DELETE' })
    )
    expect(deleted.status).toBe(200)
  })

  it('lista citas y cancela solo las futuras', async () => {
    const store = createMemoryAppointmentStore({
      rules: [rule()],
      appointments: [
        appointment({
          id: 'pasada',
          slotKey: '2026-02-23T10:00',
          startsAt: '2026-02-23T16:00:00.000Z'
        }),
        appointment()
      ]
    })
    const handler = createAdminAppointmentsHandler(deps(store))

    const listed = await json(await handler(adminRequest('/api/admin/appointments/bookings')))
    expect(listed.appointments[0].id).toBe('cita-1')

    const past = await handler(
      jsonRequest('/api/admin/appointments/bookings?id=pasada', 'PATCH', {}, true)
    )
    expect(past.status).toBe(400)

    const cancelled = await handler(
      jsonRequest('/api/admin/appointments/bookings?id=cita-1', 'PATCH', {}, true)
    )
    expect(cancelled.status).toBe(200)
    expect((await json(cancelled)).appointment).toMatchObject({
      status: 'cancelled',
      cancelledAt: '2026-03-01T12:00:00.000Z'
    })

    const available = await json(
      await createAppointmentSlotsHandler(deps(store))(
        publicRequest('/api/appointments/slots?from=2026-03-09&to=2026-03-09')
      )
    )
    expect(available.slots.map((slot: { slotKey: string }) => slot.slotKey)).toContain(
      '2026-03-09T10:00'
    )
  })
})
