import { describe, expect, it } from 'vitest'
import {
  addDaysToDateKey,
  formatLocalSlotKey,
  getWeekday,
  isValidDateKey,
  parseSlotKey,
  slotKeyToUtc,
  zonedTimeToUtc
} from '../timezone'

describe('zona horaria de citas', () => {
  it('convierte hora local de México a UTC y viceversa', () => {
    expect(slotKeyToUtc('2026-03-02T10:00')).toBe('2026-03-02T16:00:00.000Z')
    expect(formatLocalSlotKey(new Date('2026-03-02T16:00:00.000Z'))).toBe('2026-03-02T10:00')
    expect(formatLocalSlotKey(new Date('2026-01-02T16:00:00.000Z'))).toBe('2026-01-02T10:00')
  })

  it('valida claves, fechas y calcula el día de la semana local', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false)
    expect(parseSlotKey('2026-03-02T25:00')).toBeNull()
    expect(parseSlotKey('2026-03-02T10:00')?.dateKey).toBe('2026-03-02')
    expect(getWeekday('2026-03-02')).toBe(1)
    expect(getWeekday('2026-03-01')).toBe(0)
    expect(addDaysToDateKey('2026-03-31', 1)).toBe('2026-04-01')
  })

  it('normaliza una hora inexistente por cambio de horario', () => {
    const instant = zonedTimeToUtc(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      'America/New_York'
    )
    expect(instant).not.toBeNull()
    expect(formatLocalSlotKey(instant!, 'America/New_York')).toBe('2026-03-08T03:30')
  })

  it('elige la primera repetición en una hora ambigua', () => {
    const instant = zonedTimeToUtc(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      'America/New_York'
    )
    expect(instant?.toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })
})
