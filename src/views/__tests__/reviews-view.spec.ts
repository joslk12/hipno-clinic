import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory, createRouter } from 'vue-router'
import ReviewsView from '../ReviewsView.vue'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const listResponse = {
  reviews: [
    {
      id: '1',
      name: 'Ana López',
      rating: 5,
      message: 'Una experiencia muy clara y respetuosa.',
      createdAt: '2026-01-01T12:00:00.000Z'
    }
  ],
  summary: { average: 5, count: 1 }
}

async function renderView(token?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/resenas', component: ReviewsView }]
  })
  await router.push(token ? `/resenas?token=${token}` : '/resenas')
  await router.isReady()

  return render(ReviewsView, { global: { plugins: [router, createTestHead()] } })
}

function mockFetch(options: { valid?: boolean; failCheck?: boolean } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/api/reviews/invitation')) {
      if (options.failCheck) return Promise.reject(new Error('offline'))
      return Promise.resolve({
        ok: true,
        json: async () => ({ valid: options.valid ?? false })
      })
    }
    if (init?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({
          review: listResponse.reviews[0],
          status: 'approved',
          message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
        })
      })
    }
    return Promise.resolve({ ok: true, json: async () => listResponse })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ReviewsView', () => {
  it('muestra el resumen y oculta el formulario sin token', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    expect(screen.getByText('5.0')).toBeInTheDocument()
    expect(screen.getByText('1 reseña publicada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
    expect(screen.getByText(/Publicamos las experiencias/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/reviews/invitation'),
      expect.anything()
    )
  })

  it('muestra el formulario con un token vigente y envía el token', async () => {
    const fetchMock = mockFetch({ valid: true })
    await renderView('token-valido-de-prueba-1234567890')

    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Tu nombre'), 'María')
    await user.click(screen.getByRole('radio', { name: '4 de 5 estrellas' }))
    await user.type(screen.getByLabelText('Tu reseña'), 'Me sentí acompañada durante todo el proceso.')
    await user.click(screen.getByLabelText('Acepto que mi reseña se publique en el sitio.'))
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Tu reseña ya está publicada.')
    )

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST')
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      invitationToken: 'token-valido-de-prueba-1234567890'
    })
  })

  it('oculta el formulario con un token inválido', async () => {
    mockFetch({ valid: false })
    await renderView('token-invalido-de-prueba-123456')

    await waitFor(() =>
      expect(screen.getByText(/Esta liga ya no es válida/)).toBeInTheDocument()
    )
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
  })

  it('muestra error si falla la validación de la invitación', async () => {
    mockFetch({ failCheck: true })
    await renderView('token-valido-de-prueba-1234567890')

    await waitFor(() =>
      expect(screen.getByText(/No pudimos validar la invitación/)).toBeInTheDocument()
    )
    expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument()
  })

  it('muestra error y permite reintentar si falla el listado', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ok: true, json: async () => listResponse })
    vi.stubGlobal('fetch', fetchMock)
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos conectar con el servicio de reseñas.'
      )
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
  })
})
