import { appointmentsRequest, AppointmentsApiError } from './appointments'
import type {
  AdminAppointmentsResponse,
  AdminRulesResponse,
  AdminSlotsResponse,
  Appointment,
  AvailabilityRule,
  AvailabilityRuleInput,
  ManualSlotInput,
  ManualSlotRecord
} from '../types/appointments'

/** Alias del error público para que el panel use la misma clase tipada. */
export const AdminAppointmentsApiError = AppointmentsApiError
export type AdminAppointmentsApiError = AppointmentsApiError

interface OkResponse {
  ok: true
}

interface RuleResponse {
  rule: AvailabilityRule
}

interface SlotResponse {
  slot: ManualSlotRecord
}

interface AppointmentResponse {
  appointment: Appointment
}

export function listRules(): Promise<AvailabilityRule[]> {
  return appointmentsRequest<AdminRulesResponse>('/api/admin/appointments/rules').then(
    (response) => response.rules
  )
}

export function createRule(input: AvailabilityRuleInput): Promise<AvailabilityRule> {
  return appointmentsRequest<RuleResponse>('/api/admin/appointments/rules', {
    method: 'POST',
    body: JSON.stringify(input)
  }).then((response) => response.rule)
}

export function updateRule(
  id: string,
  input: Partial<AvailabilityRuleInput>
): Promise<AvailabilityRule> {
  return appointmentsRequest<RuleResponse>(
    `/api/admin/appointments/rules?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    }
  ).then((response) => response.rule)
}

export function deleteRule(id: string): Promise<OkResponse> {
  return appointmentsRequest<OkResponse>(
    `/api/admin/appointments/rules?id=${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
}

export function listManualSlots(): Promise<ManualSlotRecord[]> {
  return appointmentsRequest<AdminSlotsResponse>('/api/admin/appointments/slots').then(
    (response) => response.slots
  )
}

export function createManualSlot(input: ManualSlotInput): Promise<ManualSlotRecord> {
  return appointmentsRequest<SlotResponse>('/api/admin/appointments/slots', {
    method: 'POST',
    body: JSON.stringify(input)
  }).then((response) => response.slot)
}

export function setSlotBlocked(slotKey: string, blocked: boolean): Promise<ManualSlotRecord> {
  return appointmentsRequest<SlotResponse>(
    `/api/admin/appointments/slots?slotKey=${encodeURIComponent(slotKey)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ blocked })
    }
  ).then((response) => response.slot)
}

export function deleteManualSlot(slotKey: string): Promise<OkResponse> {
  return appointmentsRequest<OkResponse>(
    `/api/admin/appointments/slots?slotKey=${encodeURIComponent(slotKey)}`,
    { method: 'DELETE' }
  )
}

export function listBookings(): Promise<Appointment[]> {
  return appointmentsRequest<AdminAppointmentsResponse>('/api/admin/appointments/bookings').then(
    (response) => response.appointments
  )
}

export function cancelBooking(id: string): Promise<Appointment> {
  return appointmentsRequest<AppointmentResponse>(
    `/api/admin/appointments/bookings?id=${encodeURIComponent(id)}`,
    { method: 'PATCH' }
  ).then((response) => response.appointment)
}
