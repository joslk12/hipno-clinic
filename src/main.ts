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

export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ app }) => {
    app.use(createPinia())
  }
)
