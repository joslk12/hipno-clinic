import { describe, expect, it, vi } from 'vitest'
import { createInvitationSender } from '../messaging'

function okResponse(id = 'msg_1') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ id }),
    text: async () => ''
  }
}

describe('createInvitationSender', () => {
  it('envía por Resend con la liga y el remitente configurado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse())
    const sender = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      resendApiKey: 're_key',
      fromEmail: 'hola@example.com'
    })

    const result = await sender.sendEmail({
      to: 'ana@example.com',
      name: 'Ana',
      link: 'https://origenconsciente.mx/resenas?token=abc'
    })

    expect(result).toEqual({ ok: true, providerMessageId: 'msg_1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_key')
    expect(JSON.parse(init.body).to[0]).toBe('ana@example.com')
    expect(JSON.parse(init.body).html).toContain('https://origenconsciente.mx/resenas?token=abc')
  })

  it('envía por WhatsApp Cloud API usando la plantilla aprobada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse('wamid.1'))
    const sender = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      whatsappAccessToken: 'wa_token',
      whatsappPhoneNumberId: '123456'
    })

    const result = await sender.sendWhatsApp({
      to: '525631270122',
      name: 'Ana',
      link: 'https://origenconsciente.mx/resenas?token=abc'
    })

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v20.0/123456/messages')
    const body = JSON.parse(init.body)
    expect(body.template.name).toBe('review_invitation')
    expect(body.template.components[0].parameters[1].text).toContain('token=abc')
  })

  it('deshabilita canales sin credenciales y reporta errores del proveedor', async () => {
    const sender = createInvitationSender()
    expect(sender.emailConfigured).toBe(false)
    expect(sender.whatsappConfigured).toBe(false)

    const email = await sender.sendEmail({ to: 'a@b.com', name: 'A', link: 'l' })
    expect(email.ok).toBe(false)
    expect(email.error).toMatch(/no está configurado/)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request'
    })
    const failing = createInvitationSender({
      fetchImpl: fetchMock as unknown as typeof fetch,
      resendApiKey: 're_key',
      fromEmail: 'hola@example.com'
    })
    const failed = await failing.sendEmail({ to: 'a@b.com', name: 'A', link: 'l' })
    expect(failed.ok).toBe(false)
    expect(failed.error).toContain('400')
    expect(failed.error).not.toContain('re_key')
  })
})
