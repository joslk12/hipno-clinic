import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTACT_FORM_NAME, sendContact } from '../contact'

const payload = {
  name: 'Ana',
  email: 'ana@example.com',
  phone: '+52 55 1234 5678',
  message: 'Me interesa una sesión de hipnosis regresiva.'
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendContact', () => {
  it('envía el formulario a Netlify Forms con urlencoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    })

    vi.stubGlobal('fetch', fetchMock)

    const result = await sendContact(payload)

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    const body = new URLSearchParams(init.body as string)

    expect(url).toBe('/')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(body.get('form-name')).toBe(CONTACT_FORM_NAME)
    expect(body.get('name')).toBe('Ana')
    expect(body.get('email')).toBe('ana@example.com')
    expect(body.get('phone')).toBe('+52 55 1234 5678')
    expect(body.get('message')).toBe('Me interesa una sesión de hipnosis regresiva.')
  })

  it('lanza un error si el servicio responde con error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
    )

    await expect(sendContact(payload)).rejects.toThrow('No se pudo enviar la solicitud.')
  })
})
