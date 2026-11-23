import { createAdminAppointmentsHandler } from '../lib/appointments/handlers'
import { getAppointmentStore, hasAppointmentDatabase } from '../lib/appointments/runtime'

export const config = { path: '/api/admin/appointments/bookings' }

export default async function adminAppointments(request: Request) {
  return createAdminAppointmentsHandler({
    store: getAppointmentStore(),
    sessionSecret: process.env.BLOG_SESSION_SECRET,
    databaseConfigured: hasAppointmentDatabase()
  })(request)
}
