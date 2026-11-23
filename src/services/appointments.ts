import { getBookingWindow } from '../content/appointments'
import type {
  Appointment,
  AppointmentInput,
  ApiErrorResponse,
  AvailableSlotsResponse,
  AppointmentCreatedResponse,
  ScheduleSlot
} from '../types/appointments'

/** Error de la API de citas, con los campos devueltos por el backend. */
export class AppointmentsApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>
  readonly slotConflict: boolean

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
    slotConflict = status === 409
  ) {
    super(message)
    this.name = 'AppointmentsApiError'
    this.status = status
    this.fields = fields
    this.slotConflict = slotConflict
  }
}

function isApiErrorPayload(payload: unknown): payload is ApiErrorResponse {
  return payload !== null && typeof payload === 'object' && 'error' in payload
}

/** Petición same-origin a las APIs de citas, con errores del backend tipados. */
export async function appointmentsRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin'
    })
  } catch {
    throw new AppointmentsApiError(
      'No pudimos conectar con el servicio de citas. Revisa tu conexión e inténtalo de nuevo.',
      0
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = isApiErrorPayload(payload)
      ? payload.error
      : 'No pudimos completar la solicitud. Inténtalo de nuevo.'
    const fields =
      isApiErrorPayload(payload) && payload.fields && typeof payload.fields === 'object'
        ? payload.fields
        : undefined

    throw new AppointmentsApiError(message, response.status, fields)
  }

  return payload as T
}

function buildSlotsQuery(from?: string, to?: string, serviceId?: string | null): string {
  const window = getBookingWindow()
  const params = new URLSearchParams()
  params.set('from', from || window.from)
  params.set('to', to || window.to)

  if (serviceId) params.set('serviceId', serviceId)

  return params.toString()
}

/** Devuelve los horarios disponibles en el rango indicado (por defecto, 60 días). */
export async function listAvailableSlots(
  from?: string,
  to?: string,
  serviceId?: string | null
): Promise<ScheduleSlot[]> {
  const query = buildSlotsQuery(from, to, serviceId)
  const response = await appointmentsRequest<AvailableSlotsResponse>(
    `/api/appointments/slots?${query}`
  )

  return Array.isArray(response?.slots) ? response.slots : []
}

/** Crea una reserva. Un 409 se expone con `slotConflict` en el error. */
export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const response = await appointmentsRequest<AppointmentCreatedResponse>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(input)
  })

  return response.appointment
}
