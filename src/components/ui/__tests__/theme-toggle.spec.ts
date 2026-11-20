import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../ThemeToggle.vue'
import { applyTheme, THEME_STORAGE_KEY } from '../../../composables/useTheme'

beforeEach(() => {
  window.localStorage.clear()
  applyTheme('light')
})

afterEach(() => cleanup())

describe('ThemeToggle', () => {
  it('cambia el tema, aria-checked, theme-color y localStorage', async () => {
    const user = userEvent.setup()

    render(ThemeToggle)

    const toggle = screen.getByRole('switch', { name: 'Cambiar a tema oscuro' })
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toHaveAccessibleName('Cambiar a tema claro')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(meta).toHaveAttribute('content', '#1A1A1A')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('funciona con Tab y teclado', async () => {
    const user = userEvent.setup()

    render(ThemeToggle)

    const toggle = screen.getByRole('switch')

    await user.tab()

    expect(toggle).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })
})
