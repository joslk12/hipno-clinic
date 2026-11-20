import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ServicesView from '../ServicesView.vue'
import { routes } from '../../router'
import { useBookingStore } from '../../stores/booking'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => cleanup())

async function renderServices() {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })

  await router.push('/servicios')
  await router.isReady()

  const user = userEvent.setup()
  render(ServicesView, { global: { plugins: [pinia, router, createTestHead()] } })

  return { pinia, router, user }
}

describe('ServicesView', () => {
  it('muestra los tres servicios con sus datos', async () => {
    await renderServices()

    expect(screen.getByRole('heading', { level: 1, name: 'Servicios' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('Hipnosis Regresiva')).toBeInTheDocument()
    expect(screen.getByText('Hipnosis Regenerativa')).toBeInTheDocument()
    expect(screen.getByText('Terapia de Sanación Emocional')).toBeInTheDocument()
    expect(screen.getByText('$1,800 MXN')).toBeInTheDocument()
    expect(screen.getByText('$2,200 MXN')).toBeInTheDocument()
    expect(screen.getByText('$1,500 MXN')).toBeInTheDocument()
  })

  it('guarda el servicio seleccionado y navega a contacto', async () => {
    const { pinia, router, user } = await renderServices()

    await user.click(screen.getAllByRole('button', { name: 'AGENDAR CITA' })[0])

    expect(useBookingStore(pinia).selectedServiceId).toBe('hipnosis-regresiva')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('contact'))
  })
})
