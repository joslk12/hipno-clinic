import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AdminReviewApiError,
  createClient,
  listClients,
  listInvitations,
  sendInvitation
} from '../adminReviewInvitations'

afterEach(() => vi.unstubAllGlobals())

describe('admin review invitations service', () => {
  it('usa credenciales same-origin para listar clientes', async () => {
    const data = { clients: [] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => data
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(listClients()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/review-clients', {
      headers: expect.any(Headers),
      credentials: 'same-origin'
    })
  })

  it('envía el alta de cliente como JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ client: { id: '1' }, message: 'Cliente registrado.' })
    })
    vi.stubGlobal('fetch', fetchMock)

    await createClient({ name: 'Ana', email: 'ana@example.com', whatsapp: '' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', email: 'ana@example.com', whatsapp: '' })
  })

  it('expone errores tipados y el estado de los canales', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Sesión no válida o expirada.' })
      })
    )
    await expect(listInvitations()).rejects.toMatchObject({
      status: 401,
      message: 'Sesión no válida o expirada.'
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          invitations: [],
          channels: { email: true, whatsapp: false }
        })
      })
    )
    expect(await listInvitations()).toEqual({
      invitations: [],
      channels: { email: true, whatsapp: false }
    })

    expect(AdminReviewApiError.name).toBe('AdminReviewApiError')
  })

  it('publica el cuerpo del envío de liga', async () => {
    const result = { invitationId: 'inv-1', link: 'l', status: 'enviada', results: [], message: 'ok' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => result
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendInvitation({ clientId: 'client-1', channels: ['email'] })
    ).resolves.toEqual(result)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ clientId: 'client-1', channels: ['email'] })
  })
})
