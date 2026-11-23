import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AppointmentScheduler from '../AppointmentScheduler.vue'
import {
  addDaysToDateKey,
  formatAppointmentDate,
  formatMonthLabel,
  getLocalDateKey,
  monthKeyFromDateKey,
  shiftMonthKey
} from '../../../content/appointments'
import type { ScheduleSlot } from '../../../types/appointments'

afterEach(() => cleanup())

function makeSlot(slotKey: string): ScheduleSlot {
  return {
    slotKey,
    startsAt: `${slotKey}:00.000Z`,
    durationMinutes: 60,
    serviceId: null,
    blocked: false,
    source: 'rule',
    ruleId: 'rule-1'
  }
}

const today = getLocalDateKey()
const firstDay = addDaysToDateKey(today, 1)
const secondDay = addDaysToDateKey(today, 2)
const nextMonthDay = `${shiftMonthKey(monthKeyFromDateKey(today), 1)}-15`

describe('AppointmentScheduler', () => {
  it('muestra la cuadrícula, permite elegir día y hora y emite el horario', async () => {
    const slots = [makeSlot(`${firstDay}T10:00`), makeSlot(`${firstDay}T12:00`), makeSlot(`${secondDay}T11:00`)]
    const { emitted } = render(AppointmentScheduler, { props: { slots } })
    const user = userEvent.setup()

    expect(screen.getByRole('heading', { name: 'Elige fecha y hora' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText(/Elige una fecha y una hora disponible/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: new RegExp(formatAppointmentDate(firstDay)) })
    )

    const timeButton = screen.getByRole('button', { name: '10:00' })
    expect(timeButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(timeButton)

    expect(emitted().select).toEqual([[slots[0]]])
    expect(timeButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('marca el día actual con aria-current y respeta el horario preseleccionado', () => {
    const slots = [makeSlot(`${today}T10:00`)]

    render(AppointmentScheduler, {
      props: { slots, selectedSlotKey: slots[0]?.slotKey ?? null }
    })

    expect(screen.getByRole('button', { name: new RegExp(formatAppointmentDate(today)) })).toHaveAttribute(
      'aria-current',
      'date'
    )
    expect(screen.getAllByText(new RegExp(formatAppointmentDate(today))).length).toBeGreaterThan(0)
  })

  it('muestra el mes actual en el encabezado, sin adelantarlo', () => {
    const [year, month] = monthKeyFromDateKey(today).split('-').map(Number)
    render(AppointmentScheduler, { props: { slots: [makeSlot(`${firstDay}T10:00`)] } })

    expect(screen.getByText(formatMonthLabel(year!, month!))).toBeInTheDocument()
    expect(document.querySelector('caption')).toHaveTextContent(
      `Horarios disponibles para ${formatMonthLabel(year!, month!)}`
    )
  })

  it('navega entre meses con botones accesibles', async () => {
    const slots = [makeSlot(`${firstDay}T10:00`), makeSlot(`${nextMonthDay}T10:00`)]
    render(AppointmentScheduler, { props: { slots } })
    const user = userEvent.setup()

    const initialMonth = document.querySelector('caption')?.textContent
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))

    expect(screen.getByRole('button', { name: new RegExp(formatAppointmentDate(nextMonthDay)) })).toBeInTheDocument()
    expect(document.querySelector('caption')?.textContent).not.toBe(initialMonth)
  })

  it('muestra estados de carga, error y vacío', async () => {
    const { rerender } = render(AppointmentScheduler, { props: { slots: [], loading: true } })

    expect(screen.getByText('Cargando horarios…')).toBeInTheDocument()

    await rerender({ slots: [], loading: false, error: 'No pudimos cargar los horarios.' })
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los horarios.')

    await rerender({ slots: [], loading: false, error: '' })
    expect(screen.getByText(/No hay horarios disponibles en este momento/)).toBeInTheDocument()
  })

  it('deshabilita los días sin horarios y permite tabular con el teclado', async () => {
    const slots = [makeSlot(`${firstDay}T10:00`)]
    render(AppointmentScheduler, { props: { slots } })
    const user = userEvent.setup()

    const dayButton = screen.getByRole('button', { name: new RegExp(formatAppointmentDate(firstDay)) })
    await user.tab()

    expect(dayButton).toHaveAttribute('type', 'button')
    expect(
      screen.getAllByRole('button').filter((button) => (button as HTMLButtonElement).disabled).length
    ).toBeGreaterThan(0)

    await fireEvent.click(dayButton)
    await waitFor(() => expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument())
  })
})
