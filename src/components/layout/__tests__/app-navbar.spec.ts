import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AppNavbar from '../AppNavbar.vue'
import { createTestRouter } from '../../../test/createTestRouter'

afterEach(() => cleanup())

async function renderNavbar(initialPath = '/') {
  const router = await createTestRouter(initialPath)
  const user = userEvent.setup()
  const view = render(AppNavbar, { global: { plugins: [router] } })

  return { router, user, ...view }
}

describe('AppNavbar', () => {
  it('abre el menú, mueve el foco y lo cierra con Escape devolviendo el foco', async () => {
    const { user } = await renderNavbar()
    const button = screen.getByRole('button', { name: /menú/i })

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'mobile-menu')

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-label', 'Cerrar menú')

    const menu = document.getElementById('mobile-menu')

    expect(menu).not.toBeNull()

    await waitFor(() => {
      expect(within(menu as HTMLElement).getByRole('link', { name: 'Inicio' })).toHaveFocus()
    })

    await user.keyboard('{Escape}')

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('cierra el menú al hacer clic fuera', async () => {
    const { user } = await renderNavbar()
    const button = screen.getByRole('button', { name: /menú/i })

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.click(document.body)

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('incluye enlaces, control de tema y CTA en el menú móvil', async () => {
    const { user } = await renderNavbar()
    const button = screen.getByRole('button', { name: /menú/i })

    await user.click(button)

    const menu = document.getElementById('mobile-menu') as HTMLElement

    expect(within(menu).getByRole('link', { name: 'Servicios' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'AGENDAR CITA' })).toBeInTheDocument()
    expect(within(menu).getByRole('switch')).toBeInTheDocument()
  })

  it('marca el enlace activo con aria-current', async () => {
    const { router } = await renderNavbar('/servicios')

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

    expect(within(nav).getByRole('link', { name: 'Servicios' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(within(nav).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    expect(router.currentRoute.value.path).toBe('/servicios')
  })

  it('expone el CTA de escritorio hacia contacto', async () => {
    await renderNavbar()

    expect(screen.getByRole('link', { name: 'AGENDAR CITA' })).toHaveAttribute('href', '/contacto')
  })
})
