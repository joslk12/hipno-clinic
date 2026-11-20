export interface ContactPayload {
  name: string
  email: string
  phone: string
  message: string
}

export const CONTACT_FORM_NAME = 'contact'

export async function sendContact(payload: ContactPayload) {
  const body = new URLSearchParams({
    'form-name': CONTACT_FORM_NAME,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    message: payload.message
  })

  const response = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) throw new Error('No se pudo enviar la solicitud.')

  return response.json().catch(() => ({}))
}
