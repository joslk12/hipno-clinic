import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const THEME_KEY = 'oc-theme'

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  vi.resetModules()
})

describe('useTheme', () => {
  it('aplica el tema claro por defecto sin preferencia guardada', async () => {
    const { useTheme } = await import('../useTheme')
    const { theme } = useTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')
  })

  it('restaura el tema oscuro guardado al inicializar', async () => {
    window.localStorage.setItem(THEME_KEY, 'dark')

    const { useTheme } = await import('../useTheme')

    expect(useTheme().theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('persiste el tema al simular una recarga', async () => {
    const firstLoad = await import('../useTheme')

    firstLoad.applyTheme('dark')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark')

    vi.resetModules()

    const secondLoad = await import('../useTheme')

    expect(secondLoad.useTheme().theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
