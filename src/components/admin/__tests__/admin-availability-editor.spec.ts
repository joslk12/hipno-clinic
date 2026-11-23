import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AdminAvailabilityEditor from '../AdminAvailabilityEditor.vue'
import {
  AdminAppointmentsApiError,
  createManualSlot,
  createRule,
  deleteRule,
  listBookings,
  listManualSlots,
  listRules,
  setSlotBlocked,
  updateRule
} from '../../../services/adminAppointments'
import { addDaysToDateKey, formatAppointmentDate, getLocalDateKey } from '../../../content/appointments'
import type { Appointment, AvailabilityRule, ManualSlotRecord } from '../../../types/appointments'

vi.mock('../../../services/adminAppointments', () => {
  class MockAppointmentsApiError extends Error {
    readonly status: number
    readonly fields?: Record<string, string>
    readonly slotConflict: boolean

    constructor(message: string, status: number, fields?: Record<string, string>) {
      super(message)
      this.name = 'AppointmentsApiError'
      this.status = status
      this.fields = fields
      this.slotConflict = status === 409
    }
  }

  return {
    AdminAppointmentsApiError: MockAppointmentsApiError,
    listRules: vi.fn(),
    listManualSlots: vi.fn(),
    listBookings: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    createManualSlot: vi.fn(),
    setSlotBlocked: vi.fn(),
    deleteManualSlot: vi.fn()
  }
})

const rule: AvailabilityRule = {
  id: 'rule-1',
  weekday: 1,
  startTime: '10:00',
  durationMinutes: 60,
  serviceId: 'hipnosis-regresiva',
  validFrom: null,
  validUntil: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const day = addDaysToDateKey(getLocalDateKey(), 1)

const manualSlot: ManualSlotRecord = {
  id: 'slot-1',
  slotKey: `${day}T10:00`,
  startsAt: `${day}T16:00:00.000Z`,
  durationMinutes: 60,
  serviceId: null,
  blocked: false,
  source: 'manual',
  ruleId: null
}

const blockedDay = addDaysToDateKey(day, 1)

const blockedSlot: ManualSlotRecord = {
  ...manualSlot,
  id: 'slot-2',
  slotKey: `${blockedDay}T12:00`,
  startsAt: `${blockedDay}T18:00:00.000Z`,
  blocked: true
}

const booking: Appointment = {
  id: 'appointment-1',
  slotKey: `${day}T10:00`,
  startsAt: `${day}T16:00:00.000Z`,
  durationMinutes: 60,
  serviceId: null,
  status: 'reserved',
  name: 'Ana López',
  email: 'ana@example.com',
  phone: '',
  message: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  cancelledAt: null,
  notification: null
}

beforeEach(() => {
  vi.mocked(listRules).mockReset().mockResolvedValue([rule])
  vi.mocked(listManualSlots).mockReset().mockResolvedValue([manualSlot, blockedSlot])
  vi.mocked(listBookings).mockReset().mockResolvedValue([booking])
  vi.mocked(createRule).mockReset().mockResolvedValue(rule)
  vi.mocked(updateRule).mockReset().mockResolvedValue(rule)
  vi.mocked(deleteRule).mockReset().mockResolvedValue({ ok: true })
  vi.mocked(createManualSlot).mockReset().mockResolvedValue(manualSlot)
  vi.mocked(setSlotBlocked).mockReset().mockResolvedValue(manualSlot)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AdminAvailabilityEditor', () => {
  it('carga reglas y horarios y marca el calendario', async () => {
    render(AdminAvailabilityEditor)

    await waitFor(() => expect(screen.getAllByText('lunes').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Hipnosis Regresiva').length).toBeGreaterThan(0)
    expect(screen.getByText('Bloqueado')).toBeInTheDocument()
    expect(screen.getByLabelText(/con citas reservadas/)).toBeInTheDocument()
    expect(screen.getByLabelText(/con horarios bloqueados/)).toBeInTheDocument()
  })

  it('da de alta una regla semanal con el servicio elegido', async () => {
    const { emitted } = render(AdminAvailabilityEditor)
    await waitFor(() => expect(screen.getByRole('button', { name: 'CREAR REGLA' })).toBeInTheDocument())

    await userEvent.click(screen.getByLabelText('lunes'))
    await userEvent.click(screen.getByLabelText('miércoles'))
    await fireEvent.update(screen.getByLabelText('Hora de inicio'), '11:30')
    await fireEvent.update(screen.getAllByLabelText('Duración (minutos)')[0], '90')
    await fireEvent.update(screen.getAllByLabelText('Servicio')[0], 'hipnosis-regresiva')
    await userEvent.click(screen.getByRole('button', { name: 'CREAR REGLA' }))

    await waitFor(() => expect(createRule).toHaveBeenCalledTimes(1))
    expect(createRule).toHaveBeenCalledWith(
      expect.objectContaining({
        weekday: 3,
        startTime: '11:30',
        durationMinutes: 90,
        serviceId: 'hipnosis-regresiva',
        active: true
      })
    )
    expect(emitted().notice).toEqual([['Regla creada (miércoles).']])
  })

  it('crea una regla para varios días a la vez', async () => {
    const { emitted } = render(AdminAvailabilityEditor)
    await waitFor(() => expect(screen.getByRole('button', { name: 'CREAR REGLA' })).toBeInTheDocument())

    await userEvent.click(screen.getByLabelText('martes'))
    await userEvent.click(screen.getByLabelText('viernes'))
    await userEvent.click(screen.getByRole('button', { name: 'CREAR REGLA' }))

    await waitFor(() => expect(createRule).toHaveBeenCalledTimes(3))
    expect(vi.mocked(createRule).mock.calls.map(([input]) => input.weekday)).toEqual([1, 2, 5])
    expect(emitted().notice).toEqual([['Reglas creadas (lunes, martes, viernes).']])
  })

  it('edita y elimina una regla', async () => {
    render(AdminAvailabilityEditor)
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBe(1))

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('heading', { name: 'Editar regla' })).toBeInTheDocument()
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10:00')

    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR REGLA' }))
    await waitFor(() => expect(updateRule).toHaveBeenCalledWith('rule-1', expect.anything()))

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])
    await waitFor(() => expect(deleteRule).toHaveBeenCalledWith('rule-1'))
  })

  it('muestra errores por campo del backend', async () => {
    vi.mocked(createRule).mockRejectedValue(
      new AdminAppointmentsApiError('Regla inválida.', 400, { startTime: 'La hora no es válida.' })
    )
    render(AdminAvailabilityEditor)

    await waitFor(() => expect(screen.getByRole('button', { name: 'CREAR REGLA' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'CREAR REGLA' }))

    await waitFor(() => expect(screen.getByText('La hora no es válida.')).toBeInTheDocument())
    expect(screen.getByText('Regla inválida.')).toBeInTheDocument()
  })

  it('agrega y bloquea horarios individuales', async () => {
    render(AdminAvailabilityEditor)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'AGREGAR HORARIO' })).toBeInTheDocument()
    )

    await fireEvent.update(screen.getByLabelText('Fecha'), '2026-07-01')
    await fireEvent.update(screen.getAllByLabelText('Hora')[0], '09:00')
    await userEvent.click(screen.getByRole('button', { name: 'AGREGAR HORARIO' }))

    await waitFor(() => expect(createManualSlot).toHaveBeenCalled())
    expect(createManualSlot).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-07-01', time: '09:00' })
    )

    await userEvent.click(screen.getByRole('button', { name: 'BLOQUEAR' }))
    await waitFor(() => expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T10:00`, true))
  })

  it('permite bloquear horas desde el calendario', async () => {
    render(AdminAvailabilityEditor)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
      ).toBeInTheDocument()
    )

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
    )

    expect(screen.getByRole('heading', { name: new RegExp('Horarios del') })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bloquear hora 10:00' }))

    await waitFor(() => expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T10:00`, true))
  })

  it('bloquea todas las horas posteriores a la elegida', async () => {
    const hours = ['10:00', '11:00', '12:00'].map((time, index) => ({
      ...manualSlot,
      id: `slot-hour-${index}`,
      slotKey: `${day}T${time}`,
      blocked: false
    }))
    vi.mocked(listManualSlots).mockResolvedValue(hours)
    vi.mocked(listBookings).mockResolvedValue([booking])

    render(AdminAvailabilityEditor)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
      ).toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
    )
    await fireEvent.update(screen.getByLabelText('Bloquear hasta'), '12:00')
    await userEvent.click(
      screen.getByRole('button', { name: /Bloquear desde aquí: 11:00 hasta 12:00/ })
    )

    await waitFor(() => expect(setSlotBlocked).toHaveBeenCalledTimes(2))
    expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T11:00`, true)
    expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T12:00`, true)
    expect(setSlotBlocked).not.toHaveBeenCalledWith(`${day}T10:00`, true)
  })

  it('crea y bloquea horas posteriores aunque no tengan regla publicada', async () => {
    const nextHour = { ...manualSlot, id: 'slot-11', slotKey: `${day}T11:00` }
    vi.mocked(listManualSlots).mockResolvedValue([manualSlot, nextHour])
    vi.mocked(listBookings).mockResolvedValue([])

    render(AdminAvailabilityEditor)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
      ).toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
    )
    await fireEvent.update(screen.getByLabelText('Bloquear hasta'), '12:00')
    await userEvent.click(
      screen.getByRole('button', { name: /Bloquear desde aquí: 10:00 hasta 12:00/ })
    )

    await waitFor(() => expect(createManualSlot).toHaveBeenCalledTimes(1))
    expect(createManualSlot).toHaveBeenCalledWith(
      expect.objectContaining({ date: day, time: '12:00' })
    )
    expect(setSlotBlocked).toHaveBeenCalledTimes(3)
    expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T11:00`, true)
    expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T12:00`, true)
  })

  it('bloquea una hora adicional aunque no tenga regla publicada', async () => {
    render(AdminAvailabilityEditor)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
      ).toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(formatAppointmentDate(day)) })
    )

    await fireEvent.update(screen.getByLabelText('Bloquear hora adicional'), '13:00')
    await userEvent.click(screen.getByRole('button', { name: 'BLOQUEAR HORA' }))

    await waitFor(() => expect(createManualSlot).toHaveBeenCalled())
    expect(createManualSlot).toHaveBeenCalledWith(
      expect.objectContaining({ date: day, time: '13:00' })
    )
    expect(setSlotBlocked).toHaveBeenCalledWith(`${day}T13:00`, true)
  })

  it('avisa de sesión expirada al recibir un 401', async () => {
    vi.mocked(listRules).mockRejectedValue(new AdminAppointmentsApiError('Sesión inválida.', 401))
    const { emitted } = render(AdminAvailabilityEditor)

    await waitFor(() => expect(emitted().unauthorized).toHaveLength(1))
  })
})
