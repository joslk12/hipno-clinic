import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AdminAppointmentsView from '../AdminAppointmentsView.vue'
import AdminNav from '../../../components/admin/AdminNav.vue'
import { routes } from '../../../router'
import { createTestHead } from '../../../test/createTestHead'
import { createTestRouter } from '../../../test/createTestRouter'
import type { Appointment } from '../../../types/appointments'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data
  }
}

const appointment: Appointment = {
  id: 'appointment-1',
  slotKey: '2026-06-15T10:00',
  startsAt: '2026-06-15T16:00:00.000Z',
  durationMinutes: 60,
  serviceId: null,
  status: 'reserved',
  name: 'Ana López',
  email: 'ana@example.com',
  phone: '5512345678',
  message: 'Consulta',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  cancelledAt: null,
  notification: null
}

function mockFetch(options: { session?: number; rules?: number } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/admin/session') {
      return Promise.resolve(
        options.session === 401
          ? jsonResponse({ authenticated: false }, 401)
          : jsonResponse({ authenticated: true })
      )
    }
    if (url === '/api/admin/appointments/rules') {
      return Promise.resolve(
        options.rules === 401
          ? jsonResponse({ error: 'Sesión inválida.' }, 401)
          : jsonResponse({ rules: [] })
      )
    }
    if (url === '/api/admin/appointments/slots') return Promise.resolve(jsonResponse({ slots: [] }))
    if (url === '/api/admin/appointments/bookings') {
      return Promise.resolve(jsonResponse({ appointments: [appointment] }))
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
  const router = await createTestRouter('/admin/citas')
  return render(AdminAppointmentsView, { global: { plugins: [router, createTestHead()] } })
}

describe('AdminAppointmentsView', () => {
  it('verifica la sesión y muestra disponibilidad y citas', async () => {
    const fetchMock = mockFetch()
    await renderView()

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/session', expect.anything())
    expect(screen.getByRole('heading', { name: 'Disponibilidad', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Citas reservadas', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Citas' })).toHaveAttribute('aria-current', 'page')
  })

  it('pide login con sesión caducada y entra tras autenticarse', async () => {
    mockFetch({ session: 401 })
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administrador' })).toBeInTheDocument()
    )

    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Disponibilidad', level: 2 })).toBeInTheDocument()
    )
  })

  it('muestra el login si una operación responde 401', async () => {
    mockFetch({ rules: 401 })
    await renderView()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administrador' })).toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión expiró. Ingresa de nuevo.')
  })

  it('cierra la sesión y vuelve al login', async () => {
    const fetchMock = mockFetch()
    await renderView()
    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Panel de administrador' })).toBeInTheDocument()
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', expect.anything())
  })

  it('detecta la ruta de citas en la navegación sin prop explícita', async () => {
    expect(routes.some((route) => route.path === '/admin/citas')).toBe(true)

    const router = await createTestRouter('/admin')
    render(AdminNav, { global: { plugins: [router] } })

    expect(screen.getByRole('link', { name: 'Citas' })).toHaveAttribute('href', '/admin/citas')
  })
})
