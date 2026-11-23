import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import './styles/main.css'
import App from './App.vue'
import { routes, scrollBehavior } from './router'

function isStaleChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message) ||
    /error loading dynamically imported module/i.test(error.message)
  )
}

/** Recarga una vez si el navegador tiene HTML de un deploy anterior. */
function reloadForStaleChunk() {
  const key = 'oc-last-chunk-reload'
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0)
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    // sessionStorage puede no estar disponible; aun así intentamos recargar.
  }
  window.location.reload()
}

export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ app, router }) => {
    app.use(createPinia())

    if (typeof window !== 'undefined') {
      router.onError((error) => {
        if (isStaleChunkError(error)) reloadForStaleChunk()
      })
    }
  }
)
