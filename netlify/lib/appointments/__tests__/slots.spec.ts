import { describe, expect, it } from 'vitest'
import { getAvailableSlots, getSlotDefinition } from '../slots'
import { createMemoryAppointmentStore } from '../store'
import { appointment, fixedNow, rule, slotRecord } from './fixtures'

function seededStore() {
  return createMemoryAppointmentStore({
    rules: [
      rule(),
      rule({ id: 'regla-duplicada', serviceId: 'otro-servicio' }),
      rule({ id: 'regla-martes', weekday: 2, startTime: '12:00', durationMinutes: 90, serviceId: 'hipnosis' })
    ],
    slots: [
      slotRecord({ slotKey: '2026-03-02T10:00', blocked: true }),
      slotRecord({
        id: 'manual-1',
        slotKey: '2026-03-04T10:00',
        startsAt: '2026-03-04T16:00:00.000Z',
        durationMinutes: 45,
        source: 'manual'
      }),
      slotRecord({
        id: 'materializada-1',
        slotKey: '2026-03-09T10:00',
        startsAt: '2026-03-09T16:00:00.000Z',
        source: 'rule',
        ruleId: 'regla-1'
      })
    ],
    appointments: [appointment()]
  })
}

describe('generación de horarios', () => {
  it('combina reglas y excepciones, deduplica y excluye bloqueos y reservas', async () => {
    const slots = await getAvailableSlots({
      store: seededStore(),
      now: fixedNow(),
      from: '2026-03-02',
      to: '2026-03-09'
    })

    expect(slots.map((slot) => slot.slotKey)).toEqual([
      '2026-03-03T12:00',
      '2026-03-04T10:00'
    ])
    expect(slots[0]).toMatchObject({
      source: 'rule',
      ruleId: 'regla-martes',
      serviceId: 'hipnosis',
      startsAt: '2026-03-03T18:00:00.000Z'
    })
    expect(slots[1]).toMatchObject({ source: 'manual', durationMinutes: 45 })
  })

  it('filtra por servicio sin ocultar horarios genéricos', async () => {
    const store = seededStore()
    const hipnosis = await getAvailableSlots({
      store,
      now: fixedNow(),
      from: '2026-03-02',
      to: '2026-03-09',
      serviceId: 'hipnosis'
    })
    expect(hipnosis.map((slot) => slot.slotKey)).toEqual([
      '2026-03-03T12:00',
      '2026-03-04T10:00'
    ])

    const otro = await getAvailableSlots({
      store,
      now: fixedNow(),
      from: '2026-03-02',
      to: '2026-03-09',
      serviceId: 'otro-servicio'
    })
    expect(otro.map((slot) => slot.slotKey)).toEqual(['2026-03-04T10:00'])
  })

  it('excluye horarios pasados', async () => {
    const slots = await getAvailableSlots({
      store: seededStore(),
      now: fixedNow(),
      from: '2026-02-23',
      to: '2026-03-01'
    })
    expect(slots).toEqual([])
  })

  it('usa un horizonte de 60 días por defecto', async () => {
    const slots = await getAvailableSlots({ store: seededStore(), now: fixedNow() })
    expect(slots.some((slot) => slot.slotKey === '2026-03-03T12:00')).toBe(true)
    expect(slots.every((slot) => slot.startsAt > fixedNow().toISOString())).toBe(true)
  })

  it('recupera la definición de una clave concreta', async () => {
    const definition = await getSlotDefinition(
      seededStore(),
      '2026-03-03T12:00',
      fixedNow()
    )
    expect(definition).toMatchObject({ source: 'rule', ruleId: 'regla-martes', durationMinutes: 90 })
    expect(await getSlotDefinition(seededStore(), '2026-03-02T10:00', fixedNow())).toBeNull()
  })
})
