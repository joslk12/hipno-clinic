import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import LazyMap from '../LazyMap.vue'
import { contact } from '../../../content/contact'

class MockIntersectionObserver {
  private callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    )
  }

  disconnect() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('LazyMap', () => {
  it('muestra el respaldo textual y el enlace a Google Maps sin URL', () => {
    render(LazyMap, { props: { embedUrl: '' } })

    expect(screen.getByText('El mapa no está disponible en este momento.')).toBeInTheDocument()
    expect(screen.getByText(contact.location)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir en Google Maps' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://www.google.com/maps/search/')
    )
  })

  it('carga el iframe cuando la sección entra en el viewport', async () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    render(LazyMap, { props: { embedUrl: 'https://example.com/map' } })

    expect(
      await screen.findByTitle('Ubicación de Origen Consciente en Santiago Tolman')
    ).toHaveAttribute('src', 'https://example.com/map')
  })
})
