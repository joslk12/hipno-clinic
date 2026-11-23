import { describe, expect, it } from 'vitest'
import {
  validateAppointmentInput,
  validateManualSlotInput,
  validateRuleInput,
  validateSlotQuery
} from '../validation'
import { rule } from './fixtures'

describe('validación de reglas', () => {
  it('acepta una regla correcta', () => {
    const result = validateRuleInput({
      weekday: 1,
      startTime: '10:00',
      durationMinutes: 60,
      serviceId: null,
      validFrom: '2026-03-01',
      validUntil: '2026-12-31',
      active: true
    })
    expect(result.ok).toBe(true)
  })

  it('rechaza día, hora, duración y rango de vigencia inválidos', () => {
    const result = validateRuleInput({
      weekday: 7,
      startTime: '25:00',
      durationMinutes: 10,
      validFrom: '2026-05-01',
      validUntil: '2026-04-01'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.fields).sort()).toEqual([
        'durationMinutes',
        'startTime',
        'validUntil',
        'weekday'
      ])
    }
  })

  it('detecta solapamientos considerando duración y vigencia', () => {
    const existing = rule({ id: 'otra', startTime: '11:00', durationMinutes: 60 })
    const result = validateRuleInput(
      { weekday: 1, startTime: '11:30', durationMinutes: 60, active: true },
      [existing]
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fields.overlap).toContain('Se solapa')

    const disjoint = validateRuleInput(
      {
        weekday: 1,
        startTime: '12:00',
        durationMinutes: 60,
        validFrom: '2026-03-01'
      },
      [rule({ id: 'otra', startTime: '10:00' })]
    )
    expect(disjoint.ok).toBe(true)

    const separatedDates = validateRuleInput(
      {
        weekday: 1,
        startTime: '10:00',
        durationMinutes: 60,
        validFrom: '2026-06-01',
        validUntil: '2026-06-30'
      },
      [rule({ id: 'otra', validFrom: '2026-01-01', validUntil: '2026-05-01' })]
    )
    expect(separatedDates.ok).toBe(true)
  })

  it('ignora reglas inactivas al comprobar solapamientos', () => {
    const result = validateRuleInput(
      { weekday: 1, startTime: '10:00', durationMinutes: 60, active: true },
      [rule({ id: 'inactiva', active: false })]
    )
    expect(result.ok).toBe(true)
  })
})

describe('validación de otros datos', () => {
  it('valida horarios individuales', () => {
    const result = validateManualSlotInput({ date: '2026-03-04', time: '10:00', durationMinutes: 30 })
    expect(result.ok).toBe(true)
    expect(validateManualSlotInput({ date: '2026-02-30', time: '10:00', durationMinutes: 30 }).ok).toBe(false)
  })

  it('valida datos de contacto y correo', () => {
    const valid = validateAppointmentInput({
      slotKey: '2026-03-02T10:00',
      name: 'Ana Ruiz',
      email: 'ANA@Example.com',
      phone: '5512345678',
      message: ''
    })
    expect(valid).toMatchObject({ ok: true, value: { email: 'ana@example.com' } })

    const invalid = validateAppointmentInput({
      slotKey: 'no-valido',
      name: 'A',
      email: 'correo-mal'
    })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) {
      expect(Object.keys(invalid.fields).sort()).toEqual(['email', 'name', 'slotKey'])
    }
  })

  it('valida el rango de consulta pública', () => {
    const valid = validateSlotQuery(new URLSearchParams('from=2026-03-01&to=2026-03-31&serviceId=hipnosis'))
    expect(valid).toMatchObject({ ok: true, value: { serviceId: 'hipnosis' } })

    const invalid = validateSlotQuery(new URLSearchParams('from=2026-03-31&to=2026-03-01'))
    expect(invalid.ok).toBe(false)
  })
})
