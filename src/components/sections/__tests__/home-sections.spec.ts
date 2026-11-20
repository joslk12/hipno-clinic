import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import ServicesSummary from '../ServicesSummary.vue'
import SpecialistPreview from '../SpecialistPreview.vue'
import { profile } from '../../../content/profile'
import { createTestRouter } from '../../../test/createTestRouter'

afterEach(() => cleanup())

describe('SpecialistPreview', () => {
  it('presenta a la especialista y enlaza a Sobre Mí', async () => {
    const router = await createTestRouter('/')
    render(SpecialistPreview, { global: { plugins: [router] } })

    expect(screen.getByRole('heading', { level: 2, name: profile.name })).toBeInTheDocument()
    expect(screen.getByText(profile.role)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /conocer más/i })).toHaveAttribute('href', '/sobre-mi')
  })
})

describe('ServicesSummary', () => {
  it('enlaza cada servicio con su ancla y ofrece agendar', async () => {
    const router = await createTestRouter('/')
    render(ServicesSummary, { global: { plugins: [router] } })

    expect(screen.getByRole('link', { name: /Hipnosis Regresiva/ })).toHaveAttribute(
      'href',
      '/servicios#hipnosis-regresiva'
    )
    expect(screen.getByRole('link', { name: /Hipnosis Regenerativa/ })).toHaveAttribute(
      'href',
      '/servicios#hipnosis-regenerativa'
    )
    expect(screen.getByRole('link', { name: /Terapia de Sanación Emocional/ })).toHaveAttribute(
      'href',
      '/servicios#terapia-sanacion-emocional'
    )
    expect(screen.getByRole('link', { name: 'AGENDAR CITA' })).toHaveAttribute('href', '/contacto')
  })
})
