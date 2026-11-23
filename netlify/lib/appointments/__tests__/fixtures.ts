import type {
  Appointment,
  AvailabilityRule,
  ManualSlotRecord
} from '../../../../src/types/appointments'

export const fixedNow = () => new Date('2026-03-01T12:00:00.000Z')
export const createdAt = '2026-03-01T12:00:00.000Z'

export function rule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: 'regla-1',
    weekday: 1,
    startTime: '10:00',
    durationMinutes: 60,
    serviceId: null,
    validFrom: null,
    validUntil: null,
    active: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  }
}

export function slotRecord(overrides: Partial<ManualSlotRecord> = {}): ManualSlotRecord {
  return {
    id: '2026-03-02T10:00',
    slotKey: '2026-03-02T10:00',
    startsAt: '2026-03-02T16:00:00.000Z',
    durationMinutes: 60,
    serviceId: null,
    blocked: false,
    source: 'manual',
    ruleId: null,
    ...overrides
  }
}

export function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'cita-1',
    slotKey: '2026-03-09T10:00',
    startsAt: '2026-03-09T16:00:00.000Z',
    durationMinutes: 60,
    serviceId: null,
    status: 'reserved',
    name: 'María López',
    email: 'maria@example.com',
    phone: '5512345678',
    message: 'Primera sesión',
    createdAt,
    updatedAt: createdAt,
    cancelledAt: null,
    notification: null,
    ...overrides
  }
}
