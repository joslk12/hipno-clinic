export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type AppointmentStatus = 'reserved' | 'cancelled'

export interface AvailabilityRule {
  id: string
  weekday: Weekday
  /** Hora local en formato HH:mm, interpretada en America/Mexico_City. */
  startTime: string
  durationMinutes: number
  serviceId: string | null
  /** Fechas locales YYYY-MM-DD; null significa sin límite. */
  validFrom: string | null
  validUntil: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AvailabilityRuleInput {
  weekday: Weekday
  startTime: string
  durationMinutes: number
  serviceId?: string | null
  validFrom?: string | null
  validUntil?: string | null
  active?: boolean
}

export interface ScheduleSlot {
  /** Clave determinista YYYY-MM-DDTHH:mm en hora local. */
  slotKey: string
  /** ISO UTC. */
  startsAt: string
  durationMinutes: number
  serviceId: string | null
  blocked: boolean
  source: 'rule' | 'manual'
  ruleId: string | null
}

export interface ManualSlotInput {
  /** YYYY-MM-DD en hora local. */
  date: string
  /** HH:mm en hora local. */
  time: string
  durationMinutes: number
  serviceId?: string | null
}

export interface BlockSlotInput {
  slotKey: string
  blocked: boolean
}

export interface ManualSlotRecord extends ScheduleSlot {
  id: string
}

export interface NotificationResult {
  ok: boolean
  error?: string
}

export interface AppointmentNotification {
  email: NotificationResult
  whatsapp: NotificationResult
}

export interface Appointment {
  id: string
  slotKey: string
  startsAt: string
  durationMinutes: number
  serviceId: string | null
  status: AppointmentStatus
  name: string
  email: string
  phone: string
  message: string
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  notification: AppointmentNotification | null
}

export interface AppointmentInput {
  slotKey: string
  name: string
  email: string
  phone: string
  message: string
  serviceId?: string | null
}

export interface AvailableSlotsResponse {
  slots: ScheduleSlot[]
}

export interface AppointmentCreatedResponse {
  appointment: Appointment
}

export interface AdminRulesResponse {
  rules: AvailabilityRule[]
}

export interface AdminSlotsResponse {
  slots: ManualSlotRecord[]
}

export interface AdminAppointmentsResponse {
  appointments: Appointment[]
}

export interface ApiErrorResponse {
  error: string
  fields?: Record<string, string>
}
