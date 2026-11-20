import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'oc-theme'

const isBrowser = typeof window !== 'undefined'
const current = ref<Theme>('light')
let initialized = false

function readInitialTheme(): Theme {
  if (!isBrowser) return 'light'

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function updateThemeColor(theme: Theme) {
  if (!isBrowser) return

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }

  meta.content = theme === 'dark' ? '#1A1A1A' : '#F9F9F9'
}

export function applyTheme(theme: Theme) {
  current.value = theme

  if (!isBrowser) return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  updateThemeColor(theme)

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    return
  }
}

export function useTheme() {
  if (!initialized && isBrowser) {
    applyTheme(readInitialTheme())
    initialized = true
  }

  return {
    theme: computed(() => current.value),
    isDark: computed(() => current.value === 'dark'),
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(current.value === 'dark' ? 'light' : 'dark')
  }
}
