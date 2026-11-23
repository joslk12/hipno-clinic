import { describe, expect, it } from 'vitest'
import { createMemoryAppointmentStore } from '../store'
import { appointment, slotRecord } from './fixtures'

function booking(id: string, slotKey = '2026-03-02T10:00') {
  return appointment({
    id,
    slotKey,
    startsAt: '2026-03-02T16:00:00.000Z'
  })
}

describe('store en memoria de citas', () => {
  it('solo permite una reserva activa por horario', async () => {
    const store = createMemoryAppointmentStore()
    const [first, second] = await Promise.all([
      store.reserveAppointment(booking('cita-1')),
      store.reserveAppointment(booking('cita-2'))
    ])

    expect([first, second].filter(Boolean)).toHaveLength(1)
    expect(await store.listReservedSlotKeys()).toEqual(['2026-03-02T10:00'])
    expect(await store.listAppointments()).toHaveLength(1)
  })

  it('libera el horario al cancelar y conserva la cita cancelada', async () => {
    const store = createMemoryAppointmentStore()
    const created = await store.reserveAppointment(booking('cita-1'))
    expect(created).not.toBeNull()

    const cancelled = await store.cancelAppointment('cita-1', '2026-03-01T13:00:00.000Z')
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelledAt: '2026-03-01T13:00:00.000Z' })
    expect(await store.listReservedSlotKeys()).toEqual([])
    expect(await store.reserveAppointment(booking('cita-2'))).not.toBeNull()
    expect(await store.listAppointments()).toHaveLength(2)
  })

  it('no sobrescribe un bloqueo al materializar un horario generado', async () => {
    const blocked = slotRecord({ slotKey: '2026-03-02T10:00', blocked: true, source: 'rule' })
    const store = createMemoryAppointmentStore({ slots: [blocked] })

    await store.materializeSlot(
      {
        slotKey: blocked.slotKey,
        startsAt: blocked.startsAt,
        durationMinutes: blocked.durationMinutes,
        serviceId: null,
        blocked: false,
        source: 'rule',
        ruleId: 'regla-1'
      },
      '2026-03-01T13:00:00.000Z'
    )

    expect((await store.getManualSlot(blocked.slotKey))?.blocked).toBe(true)
  })
})
