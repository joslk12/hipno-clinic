import type { Appointment, AppointmentNotification, NotificationResult } from '../../../src/types/appointments'
import { APPOINTMENTS_TIME_ZONE, formatLocalDateTime } from './timezone'

export interface AppointmentNotifierDeps {
  fetchImpl?: typeof fetch
  resendApiKey?: string
  fromEmail?: string
  notificationEmail?: string
  blogAdminEmail?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  whatsappNumber?: string
  timeZone?: string
}

export interface AppointmentNotifier {
  readonly emailConfigured: boolean
  readonly whatsappConfigured: boolean
  notify(appointment: Appointment): Promise<AppointmentNotification>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function serviceLabel(appointment: Appointment): string {
  return appointment.serviceId || 'Sin servicio especificado'
}

function buildMessage(appointment: Appointment, timeZone: string): string {
  const when = formatLocalDateTime(new Date(appointment.startsAt), timeZone)
  return [
    'Nueva cita en Origen Consciente:',
    `Fecha y hora: ${when} (hora de México)`,
    `Servicio: ${serviceLabel(appointment)}`,
    `Nombre: ${appointment.name}`,
    `Correo: ${appointment.email}`,
    `Teléfono: ${appointment.phone || 'No proporcionado'}`,
    appointment.message ? `Mensaje: ${appointment.message}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl: typeof fetch
): Promise<NotificationResult> {
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) {
      return { ok: false, error: `El proveedor rechazó el aviso (${response.status}).` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo contactar al proveedor del aviso.' }
  }
}

/**
 * Avisa al terapeuta por correo y WhatsApp. Un fallo nunca revierte la cita:
 * el resultado se guarda en la propia cita para mostrarlo en el panel.
 */
export function createAppointmentNotifier(deps: AppointmentNotifierDeps = {}): AppointmentNotifier {
  const fetchImpl = deps.fetchImpl ?? fetch
  const timeZone = deps.timeZone ?? APPOINTMENTS_TIME_ZONE
  const recipient = deps.notificationEmail || deps.blogAdminEmail || deps.fromEmail
  const emailConfigured = Boolean(deps.resendApiKey && deps.fromEmail && recipient)
  const whatsappConfigured = Boolean(
    deps.whatsappAccessToken && deps.whatsappPhoneNumberId && deps.whatsappNumber
  )

  return {
    emailConfigured,
    whatsappConfigured,

    async notify(appointment) {
      const text = buildMessage(appointment, timeZone)
      const when = formatLocalDateTime(new Date(appointment.startsAt), timeZone)

      const email: NotificationResult = emailConfigured
        ? await postJson(
            'https://api.resend.com/emails',
            { Authorization: `Bearer ${deps.resendApiKey}` },
            {
              from: deps.fromEmail,
              to: [recipient],
              subject: `Nueva cita | ${when} | Origen Consciente`,
              text,
              html: [
                '<p>Hay una nueva cita registrada:</p>',
                `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`
              ].join('')
            },
            fetchImpl
          )
        : { ok: false, error: 'El correo de notificaciones no está configurado.' }

      const whatsapp: NotificationResult = whatsappConfigured
        ? await postJson(
            `https://graph.facebook.com/v20.0/${deps.whatsappPhoneNumberId}/messages`,
            { Authorization: `Bearer ${deps.whatsappAccessToken}` },
            {
              messaging_product: 'whatsapp',
              to: deps.whatsappNumber,
              type: 'text',
              text: { body: text }
            },
            fetchImpl
          )
        : { ok: false, error: 'WhatsApp no está configurado para citas.' }

      return { email, whatsapp }
    }
  }
}
