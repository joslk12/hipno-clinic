import { describe, expect, it, vi } from 'vitest'
import { createAppointmentNotifier } from '../notifications'
import { appointment } from './fixtures'

const configured = {
  resendApiKey: 'clave-de-prueba',
  fromEmail: 'origen@example.com',
  notificationEmail: 'terapeuta@example.com',
  whatsappAccessToken: 'token-de-prueba',
  whatsappPhoneNumberId: '123456789',
  whatsappNumber: '525511112222'
}

describe('notificaciones de citas', () => {
  it('devuelve ok:false cuando no hay proveedores configurados', async () => {
    const fetchImpl = vi.fn()
    const notifier = createAppointmentNotifier({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const result = await notifier.notify(appointment())

    expect(result.email.ok).toBe(false)
    expect(result.whatsapp.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('envía correo y WhatsApp con los datos de la cita', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }))
    const notifier = createAppointmentNotifier({
      ...configured,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })
    const result = await notifier.notify(appointment())

    expect(result).toMatchObject({ email: { ok: true }, whatsapp: { ok: true } })
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const [emailUrl, emailInit] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const [whatsappUrl, whatsappInit] = fetchImpl.mock.calls[1] as unknown as [string, RequestInit]
    expect(emailUrl).toBe('https://api.resend.com/emails')
    expect(whatsappUrl).toContain('123456789/messages')

    const emailBody = JSON.parse(String(emailInit.body)) as { to: string[]; text: string }
    expect(emailBody.to).toEqual(['terapeuta@example.com'])
    expect(emailBody.text).toContain('09/03/2026 10:00')
    expect(emailBody.text).toContain('María López')
    expect(emailBody.text).toContain('maria@example.com')
    expect(emailBody.text).toContain('5512345678')

    const whatsappBody = JSON.parse(String(whatsappInit.body)) as { text: { body: string } }
    const bodies = JSON.stringify([emailBody, whatsappBody])
    expect(bodies).not.toContain('clave-de-prueba')
    expect(bodies).not.toContain('token-de-prueba')
  })

  it('degrada cada canal por separado sin lanzar excepciones', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('resend') ? new Response(null, { status: 500 }) : Promise.reject(new Error('red caída'))
    )
    const notifier = createAppointmentNotifier({
      ...configured,
      fetchImpl: fetchImpl as unknown as typeof fetch
    })
    const result = await notifier.notify(appointment())

    expect(result.email.ok).toBe(false)
    expect(result.whatsapp.ok).toBe(false)
    expect(result.email.error).toBeTruthy()
  })

  it('no activa WhatsApp si falta el número destino', async () => {
    const notifier = createAppointmentNotifier({
      ...configured,
      whatsappNumber: undefined,
      fetchImpl: vi.fn() as unknown as typeof fetch
    })
    expect(notifier.whatsappConfigured).toBe(false)
  })
})
