import { createAdminAppointmentSlotsHandler } from '../lib/appointments/handlers'
import { getAppointmentStore, hasAppointmentDatabase } from '../lib/appointments/runtime'

export const config = { path: '/api/admin/appointments/slots' }

export default async function adminAppointmentSlots(request: Request) {
  return createAdminAppointmentSlotsHandler({
    store: getAppointmentStore(),
    sessionSecret: process.env.BLOG_SESSION_SECRET,
    databaseConfigured: hasAppointmentDatabase()
  })(request)
}
