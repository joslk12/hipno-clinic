import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AppointmentsApiError,
  createAppointment,
  listAvailableSlots
} from '../appointments'
import type { AppointmentInput, ScheduleSlot } from '../../types/appointments'

afterEach(() => vi.unstubAllGlobals())

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data
  }
}

const input: AppointmentInput = {
  slotKey: '2026-06-15T10:00',
  name: 'Ana López',
  email: 'ana@example.com',
  phone: '5512345678',
  message: 'Quiero agendar una sesión.'
}

describe('services/appointments', () => {
  it('consulta horarios con el rango y servicio, usando same-origin', async () => {
    const slots: ScheduleSlot[] = [
      {
        slotKey: '2026-06-15T10:00',
        startsAt: '2026-06-15T16:00:00.000Z',
        durationMinutes: 60,
        serviceId: null,
        blocked: false,
        source: 'rule',
        ruleId: 'rule-1'
      }
    ]
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ slots }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listAvailableSlots('2026-06-15', '2026-08-14', 'hipnosis-regresiva')).resolves.toEqual(
      slots
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/appointments/slots?')
    expect(url).toContain('from=2026-06-15')
    expect(url).toContain('to=2026-08-14')
    expect(url).toContain('serviceId=hipnosis-regresiva')
    expect(init.credentials).toBe('same-origin')
  })

  it('usa el horizonte por defecto y tolera respuestas sin slots', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listAvailableSlots()).resolves.toEqual([])

    const [url] = fetchMock.mock.calls[0]
    expect(url).toMatch(/from=\d{4}-\d{2}-\d{2}/)
    expect(url).toMatch(/to=\d{4}-\d{2}-\d{2}/)
    expect(url).not.toContain('serviceId')
  })

  it('crea la reserva como JSON y devuelve la cita', async () => {
    const appointment = { ...input, id: 'appointment-1', status: 'reserved' }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ appointment }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createAppointment(input)).resolves.toEqual(appointment)

    expect(fetchMock).toHaveBeenCalledWith('/api/appointments', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin'
    }))
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(input)
  })

  it('muestra el mensaje y campos del backend en errores 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: 'Datos inválidos.', fields: { email: 'Correo inválido.' } }, 400)
      )
    )

    await expect(createAppointment(input)).rejects.toMatchObject({
      status: 400,
      message: 'Datos inválidos.',
      fields: { email: 'Correo inválido.' },
      slotConflict: false
    })
  })

  it('marca el error 409 como conflicto de horario', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Ese horario ya está reservado.' }, 409))
    )

    await expect(createAppointment(input)).rejects.toMatchObject({
      status: 409,
      slotConflict: true,
      message: 'Ese horario ya está reservado.'
    })
  })

  it('tipa fallos de red y conserva el nombre de la clase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    await expect(listAvailableSlots()).rejects.toBeInstanceOf(AppointmentsApiError)
    await expect(listAvailableSlots()).rejects.toMatchObject({ status: 0 })
    expect(AppointmentsApiError.name).toBe('AppointmentsApiError')
  })
})
