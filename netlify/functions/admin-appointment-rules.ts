import { createAdminAppointmentRulesHandler } from '../lib/appointments/handlers'
import { getAppointmentStore, hasAppointmentDatabase } from '../lib/appointments/runtime'

export const config = { path: '/api/admin/appointments/rules' }

export default async function adminAppointmentRules(request: Request) {
  return createAdminAppointmentRulesHandler({
    store: getAppointmentStore(),
    sessionSecret: process.env.BLOG_SESSION_SECRET,
    databaseConfigured: hasAppointmentDatabase()
  })(request)
}
