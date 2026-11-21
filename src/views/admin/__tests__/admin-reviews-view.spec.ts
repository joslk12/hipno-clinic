import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminReviewsView from '../AdminReviewsView.vue'
import { createTestHead } from '../../../test/createTestHead'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const client = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data
  }
}

function mockFetch(
  options: {
    session?: number
    clients?: number
    saveError?: string
    invitationResult?: unknown
  } = {}
) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/admin/review-clients' && init?.method === 'POST' && options.saveError) {
      return Promise.resolve(jsonResponse({ error: options.saveError }, 400))
    }
    if (url === '/api/admin/session') {
      return Promise.resolve(
        options.session === 401
          ? jsonResponse({ authenticated: false }, 401)
          : jsonResponse({ authenticated: true })
      )
    }
    if (url === '/api/admin/review-clients') {
      return Promise.resolve(
        options.clients === 500
          ? jsonResponse({ error: 'No pudimos cargar los clientes.' }, 500)
          : jsonResponse({ clients: [client] })
      )
    }
    if (url === '/api/admin/review-invitations') {
      if (init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            options.invitationResult ?? {
              invitationId: 'inv-1',
              link: 'https://origenconsciente.mx/resenas?token=abc',
              status: 'pendiente',
              results: [],
              message: 'Liga generada.'
            }
          )
        )
      }
      return Promise.resolve(
        jsonResponse({ invitations: [], channels: { email: true, whatsapp: true } })
      )
    }
    if (url === '/api/admin/login' || url === '/api/admin/logout') {
      return Promise.resolve(jsonResponse({ ok: true }))
    }
    return Promise.resolve(jsonResponse({}))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/resenas', component: AdminReviewsView }]
  })
  await router.push('/admin/resenas')
  await router.isReady()

  return render(AdminReviewsView, { global: { plugins: [router, createTestHead()] } })
}

describe('AdminReviewsView', () => {
  it('verifica la sesión, carga los clientes y permite cerrar sesión', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/session', expect.anything())

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', expect.anything())
  })

  it('pide login cuando no hay sesión y entra tras autenticarse', async () => {
    mockFetch({ session: 401 })
    await renderView()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Reseñas por invitación' })).toBeInTheDocument()
    )
  })

  it('muestra el error de carga sin quedarse en loading', async () => {
    mockFetch({ clients: 500 })
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los clientes.')
    )
    expect(screen.queryByText('Cargando clientes…')).not.toBeInTheDocument()
  })

  it('muestra un error al guardar un cliente', async () => {
    mockFetch({ saveError: 'Datos inválidos.' })
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    await fireEvent.update(screen.getByLabelText('Nombre'), 'Lupita')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Datos inválidos.'))
  })

  it('genera el mensaje de WhatsApp y permite copiarlo y abrirlo', async () => {
    const text =
      'Hola Ana López, gracias por acompañarnos en Origen Consciente. Usa esta liga: https://origenconsciente.mx/resenas?token=abc'
    const whatsappUrl = `https://wa.me/525631270122?text=${encodeURIComponent(text)}`
    const fetchMock = mockFetch({
      invitationResult: {
        invitationId: 'inv-1',
        link: 'https://origenconsciente.mx/resenas?token=abc',
        status: 'pendiente',
        results: [],
        whatsapp: { text, url: whatsappUrl },
        message: 'Liga generada. Copia el mensaje y envíalo desde tu WhatsApp.'
      }
    })
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }))
    await userEvent.click(screen.getByRole('button', { name: 'GENERAR MENSAJE DE WHATSAPP' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Mensaje para WhatsApp')).toHaveValue(text)
    )
    expect(screen.getByRole('button', { name: 'COPIAR MENSAJE' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ABRIR WHATSAPP' })).toHaveAttribute(
      'href',
      whatsappUrl
    )

    const call = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/admin/review-invitations' && init?.method === 'POST'
    )
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      clientId: 'client-1',
      channels: [],
      generateWhatsapp: true
    })
  })
})
