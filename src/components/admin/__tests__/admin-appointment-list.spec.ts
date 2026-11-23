import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AdminAppointmentList from '../AdminAppointmentList.vue'
import { AdminAppointmentsApiError, cancelBooking, listBookings } from '../../../services/adminAppointments'
import type { Appointment } from '../../../types/appointments'

vi.mock('../../../services/adminAppointments', () => {
  class MockAppointmentsApiError extends Error {
    readonly status: number
    readonly fields?: Record<string, string>
    readonly slotConflict: boolean

    constructor(message: string, status: number) {
      super(message)
      this.name = 'AppointmentsApiError'
      this.status = status
      this.slotConflict = status === 409
    }
  }

  return {
    AdminAppointmentsApiError: MockAppointmentsApiError,
    listBookings: vi.fn(),
    cancelBooking: vi.fn()
  }
})

const appointment: Appointment = {
  id: 'appointment-1',
  slotKey: '2026-06-15T10:00',
  startsAt: '2026-06-15T16:00:00.000Z',
  durationMinutes: 60,
  serviceId: 'hipnosis-regresiva',
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

beforeEach(() => {
  vi.mocked(listBookings).mockReset().mockResolvedValue([appointment])
  vi.mocked(cancelBooking).mockReset().mockResolvedValue({ ...appointment, status: 'cancelled' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AdminAppointmentList', () => {
  it('lista citas con fecha, hora, servicio y contacto', async () => {
    render(AdminAppointmentList)

    await waitFor(() => expect(screen.getByText('Ana López')).toBeInTheDocument())
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Hipnosis Regresiva')).toBeInTheDocument()
    expect(screen.getByText('Reservada')).toBeInTheDocument()
  })

  it('confirma antes de cancelar y actualiza el estado', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { emitted } = render(AdminAppointmentList)

    await waitFor(() => expect(screen.getByRole('button', { name: 'CANCELAR CITA' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'CANCELAR CITA' }))

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith('appointment-1'))
    expect(confirm).toHaveBeenCalled()
    expect(emitted().notice).toEqual([['Cita cancelada. El horario vuelve a estar disponible.']])
    await waitFor(() => expect(screen.getByText('Cancelada')).toBeInTheDocument())
  })

  it('no cancela si se rechaza la confirmación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(AdminAppointmentList)

    await waitFor(() => expect(screen.getByRole('button', { name: 'CANCELAR CITA' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'CANCELAR CITA' }))

    expect(cancelBooking).not.toHaveBeenCalled()
  })

  it('muestra estados de carga, vacío y error', async () => {
    const { rerender } = render(AdminAppointmentList, { props: {} })
    expect(screen.getByRole('status')).toHaveTextContent('Cargando citas…')

    await waitFor(() => expect(screen.queryByText('Cargando citas…')).not.toBeInTheDocument())
    expect(screen.getByText('Ana López')).toBeInTheDocument()

    vi.mocked(listBookings).mockRejectedValueOnce(new Error('Network error'))
    await rerender({})
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar las citas.'))
  })

  it('avisa al padre cuando la sesión expira', async () => {
    vi.mocked(listBookings).mockRejectedValue(new AdminAppointmentsApiError('Sesión inválida.', 401))
    const { emitted } = render(AdminAppointmentList)

    await waitFor(() => expect(emitted().unauthorized).toHaveLength(1))
  })
})
