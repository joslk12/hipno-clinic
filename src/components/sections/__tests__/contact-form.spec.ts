import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createPinia, type Pinia } from 'pinia'
import ContactForm from '../ContactForm.vue'
import { useBookingStore } from '../../../stores/booking'

let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function renderForm() {
  const user = userEvent.setup()
  render(ContactForm, { global: { plugins: [pinia] } })

  return { user, booking: useBookingStore(pinia) }
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre Completo'), 'Ana López')
  await user.type(screen.getByLabelText('Correo Electrónico'), 'ana@example.com')
  await user.type(screen.getByLabelText(/Teléfono o WhatsApp/), '+52 55 1234 5678')
  await user.type(
    screen.getByLabelText('Mensaje o Motivo de Consulta'),
    'Me interesa agendar una sesión de hipnosis regresiva.'
  )
}

describe('ContactForm', () => {
  it('declara el formulario para Netlify Forms con honeypot', () => {
    renderForm()

    const form = document.querySelector<HTMLFormElement>('form[name="contact"]')

    expect(form).toHaveAttribute('data-netlify', 'true')
    expect(form).toHaveAttribute('netlify-honeypot', 'bot-field')
    expect(form?.querySelector<HTMLInputElement>('input[name="form-name"]')).toHaveValue('contact')
  })

  it('precarga el mensaje con el servicio seleccionado', async () => {
    const { booking } = renderForm()

    booking.selectService('hipnosis-regresiva')

    await waitFor(() => {
      expect(screen.getByLabelText('Mensaje o Motivo de Consulta')).toHaveValue(
        'Hola Maricela, me interesa agendar una sesión de Hipnosis Regresiva.'
      )
    })
    expect(screen.getByText('Hipnosis Regresiva')).toBeInTheDocument()
  })

  it('valida, asocia los errores y enfoca el primer campo inválido', async () => {
    const { user, booking } = renderForm()

    await user.click(screen.getByRole('button', { name: 'ENVIAR MENSAJE' }))

    const name = screen.getByLabelText('Nombre Completo')
    const email = screen.getByLabelText('Correo Electrónico')
    const message = screen.getByLabelText('Mensaje o Motivo de Consulta')

    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(/Escribe tu nombre completo/i)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(/Escribe un correo válido/i)
    expect(message).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Revisa los campos marcados.')).toBeInTheDocument()
    expect(name).toHaveFocus()
    expect(booking.errors.name).toBe('Escribe tu nombre completo.')
  })

  it('envía un formulario válido, conserva el servicio y limpia los campos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    })

    vi.stubGlobal('fetch', fetchMock)

    const { user, booking } = renderForm()

    booking.selectService('hipnosis-regresiva')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'ENVIAR MENSAJE' }))

    await waitFor(() => expect(booking.status).toBe('success'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(booking.selectedServiceId).toBe('hipnosis-regresiva')
    expect(booking.form).toEqual({ name: '', email: '', phone: '', message: '' })
    expect(screen.getByRole('status')).toHaveTextContent('Gracias por escribirnos')
  })

  it('muestra un error y conserva los datos para reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const { user, booking } = renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'ENVIAR MENSAJE' }))

    await waitFor(() => expect(booking.status).toBe('error'))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos enviar tu mensaje')
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana López')
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('ana@example.com')
  })

  it('no envía si el honeypot tiene valor', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const { user, booking } = renderForm()
    const honeypot = document.querySelector<HTMLInputElement>('input[name="bot-field"]')

    expect(honeypot).not.toBeNull()

    await fireEvent.update(honeypot as HTMLInputElement, 'spam')
    await user.click(screen.getByRole('button', { name: 'ENVIAR MENSAJE' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(booking.status).toBe('idle')
  })
})
