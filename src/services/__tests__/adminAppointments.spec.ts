import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AdminAppointmentsApiError,
  cancelBooking,
  createManualSlot,
  createRule,
  deleteManualSlot,
  deleteRule,
  listBookings,
  listManualSlots,
  listRules,
  setSlotBlocked,
  updateRule
} from '../adminAppointments'
import type { AvailabilityRule, ManualSlotRecord } from '../../types/appointments'

afterEach(() => vi.unstubAllGlobals())

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data
  }
}

const rule: AvailabilityRule = {
  id: 'rule-1',
  weekday: 1,
  startTime: '10:00',
  durationMinutes: 60,
  serviceId: null,
  validFrom: null,
  validUntil: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const manualSlot: ManualSlotRecord = {
  id: 'slot-1',
  slotKey: '2026-06-15T10:00',
  startsAt: '2026-06-15T16:00:00.000Z',
  durationMinutes: 60,
  serviceId: null,
  blocked: false,
  source: 'manual',
  ruleId: null
}

describe('services/adminAppointments', () => {
  it('lista reglas, horarios y citas con credenciales same-origin', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/rules')) return Promise.resolve(jsonResponse({ rules: [rule] }))
      if (url.endsWith('/slots')) return Promise.resolve(jsonResponse({ slots: [manualSlot] }))
      return Promise.resolve(jsonResponse({ appointments: [] }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(listRules()).resolves.toEqual([rule])
    await expect(listManualSlots()).resolves.toEqual([manualSlot])
    await expect(listBookings()).resolves.toEqual([])

    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toContain('/api/admin/appointments/')
      expect(init.credentials).toBe('same-origin')
    }
  })

  it('envía el alta y edición de reglas como JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ rule }, 201))
    vi.stubGlobal('fetch', fetchMock)

    const payload = { weekday: 1 as const, startTime: '10:00', durationMinutes: 60 }
    await expect(createRule(payload)).resolves.toEqual(rule)
    await expect(updateRule('rule 1', { active: false })).resolves.toEqual(rule)

    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body)).toEqual(payload)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/appointments/rules?id=rule%201')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body)).toEqual({ active: false })
  })

  it('elimina reglas y horarios por identificador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteRule('rule-1')).resolves.toEqual({ ok: true })
    await expect(deleteManualSlot('2026-06-15T10:00')).resolves.toEqual({ ok: true })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/appointments/rules?id=rule-1')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/appointments/slots?slotKey=2026-06-15T10%3A00')
  })

  it('crea y bloquea horarios individuales', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ slot: manualSlot }, 201))
    vi.stubGlobal('fetch', fetchMock)

    const input = { date: '2026-06-15', time: '10:00', durationMinutes: 60 }
    await expect(createManualSlot(input)).resolves.toEqual(manualSlot)
    await expect(setSlotBlocked('2026-06-15T10:00', true)).resolves.toEqual(manualSlot)

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body)).toEqual(input)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/appointments/slots?slotKey=2026-06-15T10%3A00')
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body)).toEqual({ blocked: true })
  })

  it('cancela citas y expone errores 401 con la clase compartida', async () => {
    const appointment = {
      ...manualSlot,
      id: 'appointment-1',
      startsAt: manualSlot.startsAt,
      status: 'cancelled' as const,
      name: 'Ana López',
      email: 'ana@example.com',
      phone: '',
      message: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      cancelledAt: '2026-01-02T00:00:00.000Z',
      notification: null
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ appointment }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(cancelBooking('appointment-1')).resolves.toEqual(appointment)
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Sesión no válida.' }, 401))
    )
    await expect(listRules()).rejects.toBeInstanceOf(AdminAppointmentsApiError)
    await expect(listRules()).rejects.toMatchObject({ status: 401, message: 'Sesión no válida.' })
  })
})
