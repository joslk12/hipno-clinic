import { createAppointmentSlotsHandler } from '../lib/appointments/handlers'
import { getAppointmentStore, hasAppointmentDatabase } from '../lib/appointments/runtime'

export const config = { path: '/api/appointments/slots' }

export default async function appointmentSlots(request: Request) {
  return createAppointmentSlotsHandler({
    store: getAppointmentStore(),
    databaseConfigured: hasAppointmentDatabase()
  })(request)
}
