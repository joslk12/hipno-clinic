import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import BlogView from '../BlogView.vue'
import NotFoundView from '../NotFoundView.vue'
import { createTestRouter } from '../../test/createTestRouter'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => cleanup())

describe('BlogView', () => {
  it('muestra el estado vacío cuando no hay artículos generados', async () => {
    const router = await createTestRouter('/blog')
    render(BlogView, { global: { plugins: [router, createTestHead()] } })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ideas para acompañar tu proceso' })
    ).toBeInTheDocument()
    expect(screen.getByText('Contenido próximamente')).toBeInTheDocument()
  })
})

describe('NotFoundView', () => {
  it('muestra el código 404 y un enlace de regreso', async () => {
    const router = await createTestRouter('/ruta-inexistente')
    render(NotFoundView, { global: { plugins: [router, createTestHead()] } })

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
