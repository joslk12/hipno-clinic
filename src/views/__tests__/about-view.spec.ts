import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import AboutView from '../AboutView.vue'
import { profile } from '../../content/profile'
import { createTestRouter } from '../../test/createTestRouter'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => cleanup())

describe('AboutView', () => {
  it('presenta el perfil, los pilares y el CTA de contacto', async () => {
    const router = await createTestRouter('/sobre-mi')
    render(AboutView, { global: { plugins: [router, createTestHead()] } })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Un espacio para comprenderte')
    expect(screen.getByRole('heading', { level: 2, name: profile.name })).toBeInTheDocument()
    expect(screen.getByText(profile.role)).toBeInTheDocument()

    for (const pillar of profile.pillars) {
      expect(screen.getByRole('heading', { level: 3, name: pillar.title })).toBeInTheDocument()
    }

    expect(
      screen.getByRole('img', {
        name: 'Retrato de Maricela Aguilar Enríquez, especialista en hipnosis regresiva y regenerativa'
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AGENDAR CITA' })).toHaveAttribute('href', '/contacto')
  })
})
