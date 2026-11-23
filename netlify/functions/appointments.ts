import { createCreateAppointmentHandler } from '../lib/appointments/handlers'
import {
  getAppointmentNotifier,
  getAppointmentStore,
  hasAppointmentDatabase
} from '../lib/appointments/runtime'

export const config = { path: '/api/appointments' }

export default async function appointments(request: Request) {
  return createCreateAppointmentHandler({
    store: getAppointmentStore(),
    notifier: getAppointmentNotifier(),
    databaseConfigured: hasAppointmentDatabase()
  })(request)
}
