import { getSql, hasDatabase } from '../db/client'
import { createAppointmentNotifier, type AppointmentNotifier } from './notifications'
import { createPostgresAppointmentStore, type AppointmentStore } from './store'

let store: AppointmentStore | undefined
let notifier: AppointmentNotifier | undefined

export function hasAppointmentDatabase(): boolean {
  return hasDatabase()
}

export function getAppointmentStore(): AppointmentStore {
  if (!store) store = createPostgresAppointmentStore(getSql)
  return store
}

export function getAppointmentNotifier(): AppointmentNotifier {
  if (!notifier) {
    notifier = createAppointmentNotifier({
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.REVIEWS_FROM_EMAIL,
      notificationEmail: process.env.APPOINTMENTS_NOTIFICATION_EMAIL,
      blogAdminEmail: process.env.BLOG_ADMIN_EMAIL,
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      whatsappNumber: process.env.APPOINTMENTS_WHATSAPP_NUMBER
    })
  }
  return notifier
}
