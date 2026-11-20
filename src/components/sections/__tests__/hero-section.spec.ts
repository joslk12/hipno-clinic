import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import HeroSection from '../HeroSection.vue'
import { createTestRouter } from '../../../test/createTestRouter'

afterEach(() => cleanup())

describe('HeroSection', () => {
  it('muestra el titular, el lema y los CTAs', async () => {
    const router = await createTestRouter('/')
    render(HeroSection, { global: { plugins: [router] } })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ORIGEN CONSCIENTE')
    expect(screen.getByText('HIPNOSIS REGRESIVA Y REGENERATIVA')).toBeInTheDocument()
    expect(screen.getByText('Comprende tu historia, crea nuevas posibilidades.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /descubrir hipnosis/i })).toHaveAttribute(
      'href',
      '/servicios'
    )
    expect(screen.getByRole('link', { name: /nuestros servicios/i })).toHaveAttribute(
      'href',
      '/servicios'
    )
  })
})
