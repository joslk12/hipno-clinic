import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from '../booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useBookingStore', () => {
  it('selecciona y limpia un servicio', () => {
    const booking = useBookingStore()

    booking.selectService('hipnosis-regresiva')
    expect(booking.selectedServiceId).toBe('hipnosis-regresiva')

    booking.clearService()
    expect(booking.selectedServiceId).toBeNull()
  })

  it('actualiza campos y elimina el error del campo editado', () => {
    const booking = useBookingStore()

    booking.setErrors({ name: 'Escribe tu nombre completo.' })
    booking.setField('name', 'Ana')

    expect(booking.form.name).toBe('Ana')
    expect(booking.errors.name).toBeUndefined()
  })

  it('actualiza el estado y el feedback', () => {
    const booking = useBookingStore()

    booking.setStatus('error', 'No se pudo enviar.')

    expect(booking.status).toBe('error')
    expect(booking.feedback).toBe('No se pudo enviar.')
  })

  it('reinicia todos los valores', () => {
    const booking = useBookingStore()

    booking.selectService('hipnosis-regenerativa')
    booking.setField('email', 'ana@example.com')
    booking.setErrors({ email: 'Correo inválido.' })
    booking.setStatus('success', 'Listo')

    booking.reset()

    expect(booking.selectedServiceId).toBeNull()
    expect(booking.form).toEqual({ name: '', email: '', phone: '', message: '' })
    expect(booking.errors).toEqual({})
    expect(booking.status).toBe('idle')
    expect(booking.feedback).toBe('')
  })

  it('limpia los campos sin perder el servicio seleccionado', () => {
    const booking = useBookingStore()

    booking.selectService('hipnosis-regresiva')
    booking.setField('name', 'Ana')
    booking.clearFields()

    expect(booking.selectedServiceId).toBe('hipnosis-regresiva')
    expect(booking.form.name).toBe('')
  })
})
