import { describe, expect, it } from 'vitest'
import {
  BOOKING_HORIZON_DAYS,
  addDaysToDateKey,
  formatAppointmentDate,
  formatAppointmentShortDate,
  formatAppointmentTime,
  getBookingWindow,
  getLocalDateKey,
  getWeekdayFromDateKey,
  groupSlotsByDay,
  isDateKeyValid,
  shiftMonthKey,
  zonedDateTimeToUtc
} from '../appointments'
import type { ScheduleSlot } from '../../types/appointments'

function slot(slotKey: string): ScheduleSlot {
  return {
    slotKey,
    startsAt: new Date(slotKey).toISOString(),
    durationMinutes: 60,
    serviceId: null,
    blocked: false,
    source: 'rule',
    ruleId: null
  }
}

describe('content/appointments', () => {
  it('usa el horizonte de 60 días en la zona de la clínica', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const window = getBookingWindow(now)

    expect(BOOKING_HORIZON_DAYS).toBe(60)
    expect(window.from).toBe('2026-06-15')
    expect(window.to).toBe('2026-08-14')
    expect(getLocalDateKey(now)).toBe('2026-06-15')
  })

  it('convierte fechas locales a UTC respetando la zona', () => {
    expect(zonedDateTimeToUtc(2026, 6, 15, 10, 0).toISOString()).toBe('2026-06-15T16:00:00.000Z')
  })

  it('formatea fechas y horas en es-MX', () => {
    expect(formatAppointmentDate('2026-06-15T10:00')).toContain('junio')
    expect(formatAppointmentDate('2026-06-15T10:00')).toContain('2026')
    expect(formatAppointmentShortDate('2026-06-15T10:00')).toContain('15')
    expect(formatAppointmentTime('2026-06-15T10:00')).toBe('10:00')
    expect(formatAppointmentTime('2026-06-15T16:00:00.000Z')).toBe('10:00')
    expect(formatAppointmentDate('no-valida')).toBe('')
  })

  it('agrupa y ordena los horarios por día local', () => {
    const groups = groupSlotsByDay([
      slot('2026-06-16T12:00'),
      slot('2026-06-15T11:00'),
      slot('2026-06-15T10:00')
    ])

    expect(groups.map((group) => group.date)).toEqual(['2026-06-15', '2026-06-16'])
    expect(groups[0]?.slots.map((item) => item.slotKey)).toEqual([
      '2026-06-15T10:00',
      '2026-06-15T11:00'
    ])
  })

  it('calcula fechas, weekdays y meses sin depender de la zona del servidor', () => {
    expect(addDaysToDateKey('2026-06-30', 1)).toBe('2026-07-01')
    expect(getWeekdayFromDateKey('2026-06-15')).toBe(1)
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
    expect(isDateKeyValid('2026-02-30')).toBe(false)
    expect(isDateKeyValid('2026-02-28')).toBe(true)
  })
})
