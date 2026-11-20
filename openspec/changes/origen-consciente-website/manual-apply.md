# Guía de aplicación manual — `origen-consciente-website`

Esta guía traduce `tasks.md` a pasos ejecutables. Está pensada para que implementes el sitio manualmente, tarea por tarea, verificando antes de marcarla como completada.

- Estado inicial: `0/43` tareas de implementación.
- Tema por defecto: **claro**.
- Idioma del contenido: español.
- Directorio raíz: `/Users/jose-trinidad/Sites/hipno-clinic`.
- Los assets de marca están generados en `design/generated/`.

> Regla de oro: no marques una tarea como completada hasta ejecutar su verificación. Si una verificación falla, corrige antes de avanzar.

---

## 0. Preparación

### 0.1 Leer el contexto de OpenSpec

Ejecuta:

```sh
cd /Users/jose-trinidad/Sites/hipno-clinic
openspec instructions apply --change origen-consciente-website
openspec status --change origen-consciente-website
```

Lee, como mínimo:

- `openspec/changes/origen-consciente-website/proposal.md`
- `openspec/changes/origen-consciente-website/design.md`
- `openspec/changes/origen-consciente-website/tasks.md`
- Todos los archivos de `openspec/changes/origen-consciente-website/specs/*/spec.md`

### 0.2 Verificar herramientas

```sh
node -v      # debe ser >= 20.19
npm -v       # debe ser >= 10
git --version
rg --version # opcional; si no existe, usa grep -R en los comandos de búsqueda
```

Si `npm` devuelve `E401` o un error de autenticación, revisa el registry activo. Este proyecto debe usar el registry público de npm, no el registry privado de CodeArtifact de otro proyecto.

En la raíz del proyecto debe existir un `.npmrc` con:

```ini
registry=https://registry.npmjs.org/
```

No hace falta `npm login` para instalar paquetes públicos.

### 0.3 Crear una rama de trabajo

El directorio aún no es un repositorio Git. Si quieres versionar el avance:

```sh
git init
git add openspec design
git commit -m "chore: baseline OpenSpec y assets de marca"
git checkout -b feat/origen-consciente
```

Si no quieres usar Git todavía, omite este paso.

### 0.4 Cómo marcar tareas completadas

Edita `openspec/changes/origen-consciente-website/tasks.md` y cambia:

```md
- [ ] 1.1 Crear el proyecto base...
```

por:

```md
- [x] 1.1 Crear el proyecto base...
```

Después verifica el progreso:

```sh
openspec list
# o:
openspec instructions apply --change origen-consciente-website | sed -n '/### Progress/,/### Tasks/p'
```

---

## Fase 1 — Configuración del proyecto y herramientas

### Tarea 1.1 — Crear el proyecto base con Vite + Vue 3 + TypeScript

El directorio raíz no está vacío (`openspec/`, `design/`), así que crea el template en una carpeta temporal y mézclalo:

```sh
cd /Users/jose-trinidad/Sites/hipno-clinic
npm_config_registry=https://registry.npmjs.org/ npx --yes create-vite@latest .vite-tmp --template vue-ts
rsync -a .vite-tmp/ ./
rm -rf .vite-tmp
npm config get registry
npm install
```

`npm config get registry` debe imprimir `https://registry.npmjs.org/`. Si aún imprime el registry de CodeArtifact, verifica que `.npmrc` exista en la raíz y que ya exista un `package.json` en este directorio.

**Nota sobre el registry:** como existe `/Users/jose-trinidad/Sites/package.json`, npm puede usar la configuración del directorio padre mientras este proyecto no tenga su propio `package.json`. Por eso `create-vite` se ejecuta con `npm_config_registry` explícito; después del template, el `.npmrc` local queda activo.

Si no tienes `rsync`, usa:

```sh
cp -R .vite-tmp/. ./
rm -rf .vite-tmp
```

Verifica:

```sh
npm run dev
```

Abre `http://localhost:5173`, comprueba que carga la pantalla de Vite y detén el servidor con `Ctrl+C`.

```sh
npm run build
npm run preview
```

Abre la URL que imprime `vite preview`, confirma que carga y detén el servidor.

**Criterio de aceptación:** `npm run dev` y `npm run build` terminan sin errores.

Marca `1.1` como completada.

### Tarea 1.2 — Instalar router, Pinia, Tailwind, SSG, fuentes e iconos

```sh
npm install vue-router@4 pinia lucide-vue-next @unhead/vue
npm install @fontsource/cinzel @fontsource/playfair-display @fontsource/montserrat
npm install -D tailwindcss@3 postcss autoprefixer vite-ssg
npx tailwindcss init -p
```

Esto crea `tailwind.config.js` y `postcss.config.js`.

Si `package.json` tiene `"type": "module"`, `postcss.config.js` generado con `module.exports` puede fallar. Conviértelo a ESM:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

Verifica que las dependencias quedaron instaladas:

```sh
npm ls vue-router pinia tailwindcss vite-ssg @unhead/vue
```

Verifica que el build sigue funcionando:

```sh
npm run build
```

**Nota:** si `vite-ssg` reporta un conflicto de versión con Vite, ejecuta `npm install -D vite-ssg@latest` y revisa `npm ls vite`. No uses `--force` sin revisar el conflicto.

Marca `1.2` como completada.

### Tarea 1.3 — Definir tokens semánticos para tema claro (por defecto) y oscuro

Crea la carpeta de estilos:

```sh
mkdir -p src/styles src/assets/brand/{logos,icons,ornaments,photos}
```

Crea `src/styles/tokens.css` con este contenido base. Puedes tomar los valores de `design/generated/palette/tokens.css`, pero la versión final debe ser semántica y con tema claro por defecto:

```css
:root {
  color-scheme: light;

  /* Superficies */
  --oc-bg: #f9f9f9;
  --oc-surface: #ffffff;
  --oc-surface-alt: #f1ede4;

  /* Texto */
  --oc-text: #1a1a1a;
  --oc-text-muted: #5f5f5f;

  /* Marca */
  --oc-accent: #8a6a1f;
  --oc-accent-satin: #c5a059;
  --oc-gold: #d4af37;
  --oc-border: rgba(138, 106, 31, 0.25);
  --oc-glow: radial-gradient(circle at 50% 0%, rgba(197, 160, 89, 0.22), transparent 60%);

  /* Tipografía */
  --oc-font-display: 'Cinzel', 'Cormorant Garamond', Georgia, serif;
  --oc-font-accent: 'Playfair Display', Georgia, serif;
  --oc-font-body: 'Montserrat', 'Inter', system-ui, sans-serif;

  /* Radios y sombras */
  --oc-radius-sm: 0.375rem;
  --oc-radius-md: 0.75rem;
  --oc-radius-lg: 1.25rem;
  --oc-shadow-gold: 0 0 0 1px rgba(197, 160, 89, 0.35), 0 18px 60px -24px rgba(197, 160, 89, 0.35);
}

[data-theme='dark'] {
  color-scheme: dark;

  --oc-bg: #1a1a1a;
  --oc-surface: #252525;
  --oc-surface-alt: #2e2e2e;

  --oc-text: #f9f9f9;
  --oc-text-muted: #a0a0a0;

  --oc-accent: #d4af37;
  --oc-accent-satin: #c5a059;
  --oc-border: rgba(212, 175, 55, 0.25);
  --oc-glow: radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.18), transparent 60%);
  --oc-shadow-gold: 0 0 0 1px rgba(212, 175, 55, 0.35), 0 18px 60px -24px rgba(212, 175, 55, 0.35);
}
```

Elimina `import './style.css'` de `src/main.ts` y borra `src/style.css` para evitar estilos duplicados del template.

Crea `src/styles/main.css`:

```css
@import './tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  background: var(--oc-bg);
  color: var(--oc-text);
}

body {
  margin: 0;
  font-family: var(--oc-font-body);
  background: var(--oc-bg);
  color: var(--oc-text);
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--oc-accent-satin);
  color: #1a1a1a;
}

:focus-visible {
  outline: 2px solid var(--oc-accent);
  outline-offset: 3px;
}
```

Reemplaza `tailwind.config.js` por:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--oc-bg)',
        surface: 'var(--oc-surface)',
        'surface-alt': 'var(--oc-surface-alt)',
        text: 'var(--oc-text)',
        'text-muted': 'var(--oc-text-muted)',
        accent: 'var(--oc-accent)',
        'accent-satin': 'var(--oc-accent-satin)',
        gold: 'var(--oc-gold)',
        border: 'var(--oc-border)',
        charcoal: '#1a1a1a',
        'soft-charcoal': '#252525',
        ivory: '#f9f9f9',
        muted: '#a0a0a0'
      },
      fontFamily: {
        display: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
        accent: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Montserrat', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        gold: 'var(--oc-shadow-gold)'
      }
    }
  },
  plugins: []
}
```

Si tu versión de Tailwind 3 no acepta `darkMode: ['selector', ...]`, usa:

```js
darkMode: ['class', '[data-theme="dark"]'],
```

Importa fuentes y estilos en `src/main.ts`:

```ts
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import './styles/main.css'
```

Verifica los tokens en el navegador. Con `npm run dev` abierto, en la consola de DevTools ejecuta:

```js
document.documentElement.dataset.theme = 'dark'
document.documentElement.dataset.theme = 'light'
```

Comprueba que `background`, `surface`, `text` y `accent` cambian en el inspector. Para una prueba visual rápida, reemplaza temporalmente el contenido de `src/App.vue` por:

```vue
<template>
  <main class="min-h-screen bg-bg p-10 text-text">
    <h1 class="font-display text-4xl text-accent">Origen Consciente</h1>
    <p class="mt-4 font-body text-text-muted">Prueba de tokens claro/oscuro</p>
  </main>
</template>
```

No olvides restaurar `App.vue` después.

Marca `1.3` como completada.

### Tarea 1.4 — Configurar ESLint, Prettier, Vitest y scripts

Instala herramientas:

```sh
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-vue globals eslint-config-prettier prettier vitest @vue/test-utils jsdom @testing-library/vue @testing-library/user-event @testing-library/jest-dom
```

Crea `eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'openspec', 'design'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  prettier
)
```

Crea `.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "none"
}
```

Crea `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
})
```

Crea `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Actualiza los scripts de `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc -b",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Verifica:

```sh
npm run lint
npm run typecheck
npm run test -- --passWithNoTests
npm run build
```

**Criterio de aceptación:** los cuatro comandos terminan sin errores. Si `vue-tsc -b` falla por configuración de proyectos, revisa `tsconfig.json` y `tsconfig.app.json` del template antes de cambiar a `--noEmit`.

Marca `1.4` como completada.

### Tarea 1.5 — Crear `.env.example`

Crea `.env.example`:

```sh
VITE_SITE_URL=https://origenconsciente.mx
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/REPLACE_ME
VITE_GOOGLE_MAPS_EMBED_URL=https://www.google.com/maps?q=Santiago+Tolman,+Estado+de+M%C3%A9xico&output=embed
VITE_WHATSAPP_NUMBER=525631270122
```

Crea tu copia local:

```sh
cp .env.example .env.local
```

Edita `.env.local` con el endpoint real de Formspree cuando lo tengas. No subas `.env.local` al repositorio.

Verifica que el build funciona con y sin variables opcionales:

```sh
npm run build
```

**Criterio de aceptación:** `.env.example` documenta todas las variables y el build no falla si faltan valores opcionales. El código debe tratar `VITE_FORMSPREE_ENDPOINT` vacío como “formulario no configurado” y mostrar un mensaje claro, no romper el render.

Marca `1.5` como completada.

---

## Fase 2 — Sistema de diseño y estructura global

### Tarea 2.1 — Componentes base

Crea estos archivos en `src/components/ui/`:

| Archivo | Props principales | Requisitos |
|---|---|---|
| `BaseButton.vue` | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size: 'sm' \| 'md' \| 'lg'`, `disabled`, `loading`, `type`, `as` | Renderiza `<button>` por defecto; si `as="a"`, renderiza `<a>`. Usa `bg-accent text-bg` en primario, borde dorado en secundario. `disabled` y `loading` bloquean clic. |
| `BaseCard.vue` | `interactive`, `as` | Superficie `bg-surface`, borde `border-border`, radio `rounded-2xl`, hover dorado si `interactive`. |
| `BaseBadge.vue` | `tone: 'gold' \| 'neutral'` | Fondo `bg-accent-satin`, texto `#1a1a1a`; no usar solo color para transmitir estado. |
| `BaseInput.vue` | `id`, `label`, `modelValue`, `type`, `error`, `required`, `optional`, `autocomplete` | `<label>` asociado, `aria-invalid`, `aria-describedby` si hay error. |
| `BaseTextarea.vue` | Igual que `BaseInput` + `rows` | Mismas reglas de accesibilidad. |
| `SectionHeading.vue` | `eyebrow`, `title`, `subtitle`, `as` | Renderiza `h1`, `h2` o `h3` según `as`; no dupliques `h1` por página. |

Pruebas mínimas en `src/components/ui/__tests__/`:

```ts
import { render, screen } from '@testing-library/vue'
import BaseButton from '../BaseButton.vue'

it('renderiza el texto y respeta disabled', () => {
  render(BaseButton, { props: { disabled: true }, slots: { default: 'AGENDAR CITA' } })
  expect(screen.getByRole('button', { name: 'AGENDAR CITA' })).toBeDisabled()
})
```

Verifica:

```sh
npm run test
npm run typecheck
```

Marca `2.1` como completada.

### Tarea 2.2 — Integrar ornamentos, geometría e iconografía

Copia los assets seleccionados:

```sh
cp -R design/generated/logos/. src/assets/brand/logos/
cp -R design/generated/icons/. src/assets/brand/icons/
cp -R design/generated/photos/. src/assets/brand/photos/
mkdir -p src/assets/brand/ornaments
cp design/generated/ornaments/*.svg src/assets/brand/ornaments/
```

Crea `src/components/ui/BrandLogo.vue` con un mapa de variantes y dimensiones reales:

| Variante | Archivo | Dimensiones |
|---|---|---|
| `horizontal` | `origen-consciente-horizontal` | 1009 × 466 |
| `vertical` | `origen-consciente-vertical` | 567 × 713 |
| `minimal` | `origen-consciente-minimal` | 1014 × 468 |
| `symbol` | `origen-symbol` | 401 × 445 |
| `wordmark` | `origen-wordmark` | 623 × 217 |

Usa `<picture>` con WebP y PNG de respaldo. Para el logo horizontal:

```vue
<picture>
  <source :srcset="webp" type="image/webp" />
  <img :src="png" :width="1009" :height="466" alt="Origen Consciente" />
</picture>
```

Crea `src/components/ui/BrandOrnament.vue`. Importa una selección de SVG con `?raw` y renderiza con `v-html`:

```ts
import corner1 from '@/assets/brand/icons/corner-ornament-01.svg?raw'
import corner2 from '@/assets/brand/icons/corner-ornament-02.svg?raw'

const ornaments = { 'corner-1': corner1, 'corner-2': corner2 } as const
```

El componente debe:

- Recibir `name` y `class`.
- Ser decorativo: `aria-hidden="true"` y `focusable="false"`.
- No aceptar HTML externo; solo assets locales del mapa.

Añade pruebas de snapshot:

```ts
import { render } from '@testing-library/vue'
import BrandOrnament from '../BrandOrnament.vue'

it('renderiza el ornamento solicitado', () => {
  const { container } = render(BrandOrnament, { props: { name: 'corner-1' } })
  expect(container.firstChild).toMatchSnapshot()
})
```

Revisa visualmente `_contact-sheet.jpg` y elige solo los ornamentos útiles; no es necesario importar los 39.

Marca `2.2` como completada.

### Tarea 2.3 — AppShell con landmarks y accesibilidad

Crea `src/components/layout/AppShell.vue`:

```vue
<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <AppNavbar />
  <main id="main" tabindex="-1">
    <slot />
  </main>
  <AppFooter />
</template>
```

Requisitos:

- `header`, `nav`, `main` y `footer` semánticos.
- El enlace “Saltar al contenido” es visible al recibir foco.
- `main` tiene `tabindex="-1"` para recibir foco tras el salto.
- Respeta `prefers-reduced-motion`.

Añade a `src/styles/main.css`:

```css
.skip-link {
  position: absolute;
  left: 1rem;
  top: -100px;
  z-index: 100;
  background: var(--oc-surface);
  color: var(--oc-text);
  padding: 0.75rem 1rem;
  border: 1px solid var(--oc-accent);
  border-radius: var(--oc-radius-sm);
}

.skip-link:focus {
  top: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Instala `vitest-axe` para pruebas unitarias de accesibilidad:

```sh
npm install -D vitest-axe
```

Prueba `AppShell` con `axe`:

```ts
import { render } from '@testing-library/vue'
import { axe } from 'vitest-axe'
import AppShell from '../AppShell.vue'

it('no tiene violaciones críticas', async () => {
  const { container } = render(AppShell, { slots: { default: '<h1>Inicio</h1>' } })
  expect(await axe(container)).toHaveNoViolations()
})
```

Marca `2.3` como completada.

### Tarea 2.4 — Navbar, menú móvil y estado activo

Crea:

- `src/components/layout/AppNavbar.vue`
- `src/components/layout/MobileMenu.vue`
- `src/components/ui/ThemeToggle.vue` (se completa en 2.8)

Enlaces exactos:

| Texto | Ruta |
|---|---|
| Inicio | `/` |
| Servicios | `/servicios` |
| Sobre Mí | `/sobre-mi` |
| Blog | `/blog` |
| Contacto | `/contacto` |
| AGENDAR CITA | `/contacto` |

Requisitos de la navbar:

- `sticky top-0 z-50` con fondo `bg-bg/80` y `backdrop-blur`.
- Logo horizontal a la izquierda.
- Enlace activo con `aria-current="page"` (basado en `useRoute().path`).
- Botón CTA “AGENDAR CITA” visible en escritorio.
- Botón de menú móvil con `aria-expanded` y `aria-controls`.

Requisitos del menú móvil:

- Se abre y cierra con el botón.
- Al abrir, mueve el foco al primer enlace.
- `Escape` cierra y devuelve el foco al botón.
- Un clic fuera cierra.
- Incluye todos los enlaces, el control de tema y el CTA.
- No deja el foco atrapado fuera del menú mientras está abierto.

Pruebas:

```ts
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AppNavbar from '../AppNavbar.vue'

it('abre y cierra el menú móvil con teclado', async () => {
  render(AppNavbar)
  const button = screen.getByRole('button', { name: /menú/i })
  await userEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{Escape}')
  expect(button).toHaveAttribute('aria-expanded', 'false')
})
```

Marca `2.4` como completada.

### Tarea 2.5 — Footer global con contacto

Crea `src/content/contact.ts` ahora (3.1 lo ampliará):

```ts
export const contact = {
  phoneDisplay: '+52 56 3127 0122',
  phoneHref: 'tel:+525631270122',
  whatsapp: '525631270122',
  email: 'mariaguienri88@gmail.com',
  location: 'Santiago Tolman, Estado de México',
  tagline: 'Sana tu mente - Equilibra tus emociones - Transforma tu vida'
}

export const WHATSAPP_MESSAGE =
  'Hola Maricela, me gustaría solicitar información para agendar una sesión de hipnosis.'

export function whatsappUrl(message = WHATSAPP_MESSAGE) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`
}
```

Crea `src/components/layout/AppFooter.vue` con:

- Teléfono visible y enlace `tel:`.
- Correo visible y enlace `mailto:`.
- Ubicación.
- Lema exacto.
- Enlace de WhatsApp con `whatsappUrl()`.

Prueba:

```ts
import { render, screen } from '@testing-library/vue'
import AppFooter from '../AppFooter.vue'

it('genera los enlaces de contacto correctos', () => {
  render(AppFooter)
  expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute(
    'href',
    expect.stringContaining('https://wa.me/525631270122?text=')
  )
  expect(screen.getByRole('link', { name: /correo/i })).toHaveAttribute(
    'href',
    'mailto:mariaguienri88@gmail.com'
  )
})
```

Marca `2.5` como completada.

### Tarea 2.6 — Rutas con carga diferida

Crea `src/router/index.ts` y exporta el arreglo `routes`:

```ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/servicios', name: 'services', component: () => import('@/views/ServicesView.vue') },
  { path: '/sobre-mi', name: 'about', component: () => import('@/views/AboutView.vue') },
  { path: '/blog', name: 'blog', component: () => import('@/views/BlogView.vue') },
  { path: '/contacto', name: 'contact', component: () => import('@/views/ContactView.vue') },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]
```

Añade el alias `@` en `vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

Añade también el alias en `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Crea vistas mínimas en `src/views/` para que compile cada ruta. Usa `<h1>` único por vista.

Verifica:

- `/`, `/servicios`, `/sobre-mi`, `/blog`, `/contacto` abren directamente.
- Una ruta inexistente muestra `NotFoundView`.
- Las vistas se cargan con `import()` diferido.

Marca `2.6` como completada.

### Tarea 2.7 — Lógica de tema con persistencia y sin FOUC

Crea `src/composables/useTheme.ts`:

```ts
import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'oc-theme'
const isBrowser = typeof window !== 'undefined'
const current = ref<Theme>('light')
let initialized = false

function readInitialTheme(): Theme {
  if (!isBrowser) return 'light'
  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function updateThemeColor(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#1A1A1A' : '#F9F9F9')
}

export function applyTheme(theme: Theme) {
  current.value = theme
  if (!isBrowser) return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  updateThemeColor(theme)
  window.localStorage.setItem(STORAGE_KEY, theme)
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
```

Añade el script inline en `index.html`, dentro de `<head>` y antes del script del módulo:

```html
<script>
  ;(() => {
    try {
      const saved = localStorage.getItem('oc-theme')
      const theme = saved === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme

      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      meta.content = theme === 'dark' ? '#1A1A1A' : '#F9F9F9'
    } catch {}
  })()
</script>
```

Añade también en `<head>`:

```html
<meta name="theme-color" content="#F9F9F9" />
```

Verifica:

1. En DevTools, `localStorage.setItem('oc-theme', 'dark')` y recarga. El HTML debe tener `data-theme="dark"` desde el primer paint.
2. `localStorage.removeItem('oc-theme')` y recarga. Debe aplicarse `light`.
3. Recarga con `dark` y observa que no hay destello claro.
4. Cambia el tema manualmente y recarga: la preferencia se conserva.

Marca `2.7` como completada.

### Tarea 2.8 — Control accesible de cambio de tema

Completa `src/components/ui/ThemeToggle.vue`:

```vue
<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="isDark"
    :aria-label="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border text-accent transition hover:border-accent"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" class="h-5 w-5" aria-hidden="true" />
    <Moon v-else class="h-5 w-5" aria-hidden="true" />
  </button>
</template>
```

Requisitos:

- Colócalo en `AppNavbar.vue` en escritorio y dentro de `MobileMenu.vue`.
- Debe funcionar con `Tab` + `Enter`/`Espacio`.
- El nombre accesible debe indicar la acción, no solo el icono.
- `aria-checked` refleja el tema oscuro (`true`) o claro (`false`).
- Al cambiar, se actualizan `data-theme`, `color-scheme`, `theme-color` y `localStorage`.

Prueba:

```ts
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../ThemeToggle.vue'

it('cambia el tema y actualiza aria-checked', async () => {
  render(ThemeToggle)
  const toggle = screen.getByRole('switch')
  expect(toggle).toHaveAttribute('aria-checked', 'false')
  await userEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-checked', 'true')
  expect(document.documentElement.dataset.theme).toBe('dark')
})
```

Marca `2.8` como completada.

---

## Fase 3 — Contenido y secciones públicas

### Tarea 3.1 — Centralizar contenido tipado

Crea `src/content/services.ts`:

```ts
export interface Service {
  id: string
  name: string
  description: string
  duration: string
  price: string
  ctaLabel: string
  icon: string
}

export const services: Service[] = [
  {
    id: 'hipnosis-regresiva',
    name: 'Hipnosis Regresiva',
    description:
      'Exploración guiada del pasado para identificar la raíz de patrones, fobias o bloqueos inconscientes.',
    duration: '90 min',
    price: '$1,800 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'golden-ratio-01'
  },
  {
    id: 'hipnosis-regenerativa',
    name: 'Hipnosis Regenerativa',
    description:
      'Restauración de la energía vital, reconexión psico-emocional y regeneración de la tranquilidad mental.',
    duration: '120 min',
    price: '$2,200 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'golden-ratio-02'
  },
  {
    id: 'terapia-sanacion-emocional',
    name: 'Terapia de Sanación Emocional',
    description:
      'Acompañamiento para ansiedad, duelo, equilibrio emocional y desarrollo personal.',
    duration: '60 min',
    price: '$1,500 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'small-ornament-03'
  }
]

export function getService(id: string) {
  return services.find((service) => service.id === id)
}
```

Crea `src/content/profile.ts`:

```ts
export const profile = {
  name: 'Maricela Aguilar Enríquez',
  role: 'Especialista en Hipnosis Regresiva y Regenerativa',
  history:
    'Maricela Aguilar Enríquez es especialista en hipnosis regresiva y regenerativa, con certificaciones en hipnosis clínica y acompañamiento emocional. Su trayectoria combina formación profesional, práctica clínica y un enfoque profundo del bienestar. Acompaña a personas que buscan comprender el origen de sus patrones, liberar cargas emocionales y recuperar su equilibrio.',
  philosophy:
    'La hipnosis clínica es una herramienta de transformación profunda: permite acceder a la raíz de aquello que limita, integrar la experiencia y abrir espacio para nuevas formas de sentir y vivir.',
  pillars: [
    {
      title: 'Empatía y Entorno Seguro',
      description:
        'Un espacio confidencial, libre de juicios y cuidado en cada etapa del proceso.'
    },
    {
      title: 'Enfoque Regenerativo Holístico',
      description:
        'Integra mente, emoción y energía para favorecer una transformación sostenible.'
    },
    {
      title: 'Resultados Orientados al Bienestar Integral',
      description:
        'Objetivos claros y acompañamiento respetuoso para recuperar el equilibrio y la tranquilidad.'
    }
  ]
}
```

Valida el texto final con la clienta antes de publicar.

Crea `src/content/site.ts` con nombre del sitio, lema, rutas y datos de contacto reutilizables. Evita duplicar teléfonos, correos o precios en las vistas.

Pruebas:

- Cada servicio tiene `name`, `description`, `duration`, `price` y `ctaLabel`.
- Los IDs son únicos.
- El teléfono y correo coinciden con `contact.ts`.

Marca `3.1` como completada.

### Tarea 3.2 — Hero de inicio

Crea `src/components/sections/HeroSection.vue`.

Composición mínima:

- `min-h-[80vh]` con fondo `bg-bg` y `--oc-glow`.
- Logo vertical u horizontal de `BrandLogo`.
- Ornamentos de esquina de `BrandOrnament`.
- `<h1>` “ORIGEN CONSCIENTE” con `font-display`.
- Subtítulo “HIPNOSIS REGRESIVA Y REGENERATIVA”.
- Slogan “Comprende tu historia, crea nuevas posibilidades.” con `font-accent italic`.
- Botón primario “Descubrir Hipnosis” → `/servicios`.
- Botón secundario “NUESTROS SERVICIOS” → `/servicios`.

Requisitos:

- El fondo y los textos usan tokens del tema activo.
- Los botones son `RouterLink` o `BaseButton as="a"`.
- No hay desbordamiento horizontal en 320px.
- El logo no se estira ni pierde proporción.

Prueba de componente:

```ts
import { render, screen } from '@testing-library/vue'
import HeroSection from '../HeroSection.vue'

it('muestra el titular y los CTAs', () => {
  render(HeroSection)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ORIGEN CONSCIENTE')
  expect(screen.getByRole('link', { name: /descubrir hipnosis/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /nuestros servicios/i })).toBeInTheDocument()
})
```

Revisión visual: 320px, 768px, 1280px y 4K, en tema claro y oscuro.

Marca `3.2` como completada.

### Tarea 3.3 — Vista previa de la especialista y resumen de servicios

Crea:

- `src/components/sections/SpecialistPreview.vue`
- `src/components/sections/ServicesSummary.vue`

`SpecialistPreview`:

- Nombre y cargo desde `profile`.
- Descripción breve.
- Enlace “Conocer más” → `/sobre-mi`.
- Fotografía pequeña o símbolo de marca, sin forzar la resolución del retrato.

`ServicesSummary`:

- Lista o tarjetas resumidas de los tres servicios.
- Enlace por servicio a `/servicios#<id>`.
- Hover con acento dorado y foco visible.

Incluye también una acción visible de agendamiento en la página de inicio, sin obligar a bajar hasta el footer. Respeta el orden de encabezados: un solo `h1` en el hero, y `h2`/`h3` en las secciones siguientes.

Verifica que los enlaces llevan a las rutas y anclas correctas.

Marca `3.3` como completada.

### Tarea 3.4 — Sección de servicios

Crea:

- `src/views/ServicesView.vue`
- `src/components/sections/ServiceCard.vue`

Requisitos:

- Retícula `grid grid-cols-1 gap-6 md:grid-cols-3`.
- Cada tarjeta muestra icono, nombre, descripción, badge de duración, badge de inversión y CTA.
- Usa `services` como única fuente de datos.
- `article` por servicio, `h2` o `h3` según jerarquía.
- Badge de duración e inversión con `BaseBadge`.
- CTA “AGENDAR CITA” con `data-service-id`.

Prueba:

```ts
import { render, screen } from '@testing-library/vue'
import ServicesView from '../ServicesView.vue'

it('muestra los tres servicios', () => {
  render(ServicesView)
  expect(screen.getByText('Hipnosis Regresiva')).toBeInTheDocument()
  expect(screen.getByText('Hipnosis Regenerativa')).toBeInTheDocument()
  expect(screen.getByText('Terapia de Sanación Emocional')).toBeInTheDocument()
})
```

Marca `3.4` como completada.

### Tarea 3.5 — Conectar CTA con el store de agendamiento

Crea `src/stores/booking.ts` (se amplía en 4.1):

```ts
import { defineStore } from 'pinia'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    selectedServiceId: null as string | null
  }),
  actions: {
    selectService(id: string) {
      this.selectedServiceId = id
    },
    clearService() {
      this.selectedServiceId = null
    }
  }
})
```

En `ServiceCard.vue`:

```ts
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const router = useRouter()
const booking = useBookingStore()

function onBook() {
  booking.selectService(props.service.id)
  router.push({ name: 'contact' })
}
```

Prueba:

- Al activar el CTA, `booking.selectedServiceId` es el ID correcto.
- La navegación termina en `/contacto`.
- El formulario muestra el servicio preseleccionado.

Marca `3.5` como completada.

### Tarea 3.6 — Sección “Sobre Mí”

Crea:

- `src/views/AboutView.vue`
- `src/components/sections/SpecialistProfile.vue`
- `src/components/sections/PillarCard.vue`

Requisitos:

- Dos columnas en escritorio: foto a la izquierda, contenido a la derecha.
- Una columna en móvil, con orden de lectura comprensible.
- Marco dorado con `border-2 border-accent-satin p-2` o similar.
- Usa `maricela-portrait-framed` (224 × 248) sin ampliar más allá de su tamaño natural.
- `alt` descriptivo: “Retrato de Maricela Aguilar Enríquez, especialista en hipnosis regresiva y regenerativa”.
- Nombre, cargo, historia, filosofía y los tres pilares.
- CTA a `/contacto`.

Prueba:

- El nombre y cargo aparecen.
- Los tres títulos de pilares aparecen.
- La imagen tiene `alt` no vacío.
- El CTA navega a contacto.

Marca `3.6` como completada.

### Tarea 3.7 — Blog próximamente y 404

Crea `src/views/BlogView.vue`:

- Título “Blog”.
- Mensaje “Contenido próximamente”.
- Enlace al inicio.

Crea `src/views/NotFoundView.vue`:

- Código visual “404”.
- Mensaje “Página no encontrada”.
- Enlace al inicio.

Verifica que ambas rutas renderizan y que el enlace de regreso funciona.

Marca `3.7` como completada.

---

## Fase 4 — Contacto y agendamiento

### Tarea 4.1 — Store `booking` completo

Amplía `src/stores/booking.ts`:

```ts
import { defineStore } from 'pinia'

export interface ContactForm {
  name: string
  email: string
  phone: string
  message: string
}

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const emptyForm = (): ContactForm => ({ name: '', email: '', phone: '', message: '' })

export const useBookingStore = defineStore('booking', {
  state: () => ({
    selectedServiceId: null as string | null,
    form: emptyForm(),
    errors: {} as Partial<Record<keyof ContactForm, string>>,
    status: 'idle' as SubmitStatus,
    feedback: ''
  }),
  actions: {
    selectService(id: string) {
      this.selectedServiceId = id
    },
    setField(field: keyof ContactForm, value: string) {
      this.form[field] = value
      delete this.errors[field]
    },
    setErrors(errors: Partial<Record<keyof ContactForm, string>>) {
      this.errors = errors
    },
    setStatus(status: SubmitStatus, feedback = '') {
      this.status = status
      this.feedback = feedback
    },
    reset() {
      this.selectedServiceId = null
      this.form = emptyForm()
      this.errors = {}
      this.status = 'idle'
      this.feedback = ''
    }
  }
})
```

Pruebas: selección, actualización de campos, errores, reinicio.

Marca `4.1` como completada.

### Tarea 4.2 — Formulario con validación

Crea `src/components/sections/ContactForm.vue`.

Campos exactos:

| Campo | `name` | Obligatorio | Reglas |
|---|---|---|---|
| Nombre Completo | `name` | Sí | 2–80 caracteres |
| Correo Electrónico | `email` | Sí | Formato de correo, máximo 120 |
| Teléfono o WhatsApp | `phone` | No | Máximo 20, solo dígitos, `+`, espacios |
| Mensaje o Motivo de Consulta | `message` | Sí | 10–1000 caracteres |

Requisitos:

- `<form novalidate>` y validación propia.
- Etiquetas visibles y asociadas.
- Campo teléfono marcado como opcional.
- Si hay servicio preseleccionado, precarga el mensaje:

```ts
const service = booking.selectedServiceId ? getService(booking.selectedServiceId) : undefined
const initialMessage = service
  ? `Hola Maricela, me interesa agendar una sesión de ${service.name}.`
  : ''
```

- El botón dice “ENVIAR MENSAJE”.
- No envíes si hay errores.

Mensajes sugeridos:

- Nombre: “Escribe tu nombre completo.”
- Correo: “Escribe un correo válido.”
- Teléfono: “El teléfono solo puede incluir números, espacios y +.”
- Mensaje: “Cuéntanos brevemente el motivo de tu consulta (mínimo 10 caracteres).”

Pruebas de envío inválido y válido con `@testing-library/vue`.

Marca `4.2` como completada.

### Tarea 4.3 — Errores accesibles

Requisitos:

- Cada campo con error tiene `aria-invalid="true"`.
- Cada campo tiene `aria-describedby="<id>-error"`.
- El mensaje de error tiene `id="<id>-error"`.
- El resumen de errores usa `role="alert"` o `aria-live="polite"`.
- Al enviar con errores, mueve el foco al primer campo inválido.
- El error no depende solo del color: incluye texto.

Prueba de accesibilidad:

```ts
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ContactForm from '../ContactForm.vue'

it('anuncia errores y asocia el campo', async () => {
  render(ContactForm)
  await userEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))
  const name = screen.getByLabelText(/nombre completo/i)
  expect(name).toHaveAttribute('aria-invalid', 'true')
  expect(name).toHaveAccessibleDescription(/escribe tu nombre/i)
})
```

Marca `4.3` como completada.

### Tarea 4.4 — Envío a Formspree con estados y honeypot

Crea `src/services/contact.ts`:

```ts
export interface ContactPayload {
  name: string
  email: string
  phone: string
  message: string
}

export async function sendContact(payload: ContactPayload) {
  const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT
  if (!endpoint) throw new Error('Formspree no está configurado.')

  const body = new FormData()
  body.append('name', payload.name)
  body.append('email', payload.email)
  body.append('phone', payload.phone)
  body.append('message', payload.message)
  body.append('_subject', 'Nueva solicitud desde Origen Consciente')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body
  })

  if (!response.ok) throw new Error('No se pudo enviar la solicitud.')
  return response.json().catch(() => ({}))
}
```

Requisitos:

- Honeypot invisible:

```html
<div class="hidden" aria-hidden="true">
  <label for="company">No completar</label>
  <input id="company" name="_gotcha" tabindex="-1" autocomplete="off" />
</div>
```

- Si el honeypot tiene valor, aborta sin enviar.
- Botón deshabilitado mientras `status === 'submitting'`.
- Texto del botón “ENVIANDO…” durante el envío.
- Éxito: mensaje de confirmación y reset del formulario (conserva el servicio si aplica).
- Error: mensaje con opción de reintentar sin perder los datos.
- No uses claves secretas en el cliente.

Pruebas con `vi.stubGlobal('fetch', ...)` para éxito, error y envío duplicado.

Marca `4.4` como completada.

### Tarea 4.5 — Columna de contacto directo

Crea `src/components/sections/ContactInfo.vue`.

Requisitos:

- Teléfono visible y enlace `tel:+525631270122`.
- WhatsApp con el mensaje exacto:

```ts
const message = 'Hola Maricela, me gustaría solicitar información para agendar una sesión de hipnosis.'
const href = `https://wa.me/525631270122?text=${encodeURIComponent(message)}`
```

- Correo `mailto:mariaguienri88@gmail.com`.
- Ubicación “Santiago Tolman, Estado de México”.
- Iconos de `design/generated/icons/` (WhatsApp, mail, map-pin), decorativos con `alt=""` o `aria-hidden`.

Prueba los `href` generados.

Marca `4.5` como completada.

### Tarea 4.6 — Mapa de Google diferido y tematizado

Crea `src/components/sections/LazyMap.vue`.

Requisitos:

- No cargues el iframe hasta que la sección esté cerca del viewport.
- Usa `IntersectionObserver` o `loading="lazy"`.
- El iframe debe tener `title="Ubicación de Origen Consciente en Santiago Tolman"`.
- Si el iframe falla o no hay URL, muestra la ubicación textual y un enlace a Google Maps.
- Tratamiento visual según tema:

```css
.map-frame iframe {
  filter: grayscale(1) invert(0.9) contrast(0.9) brightness(0.9);
}

[data-theme='light'] .map-frame iframe {
  filter: none;
}
```

- Mantén el formulario usable antes de que el mapa cargue.

Prueba con red lenta o bloqueando el iframe: la ubicación textual debe permanecer visible.

Marca `4.6` como completada.

### Tarea 4.7 — Prueba E2E del flujo completo

Instala Playwright:

```sh
npm install -D @playwright/test @axe-core/playwright
npx playwright install
```

Crea `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
```

Crea `tests/e2e/booking-flow.spec.ts` con este flujo:

1. Abre `/servicios`.
2. Activa “AGENDAR CITA” en “Hipnosis Regresiva”.
3. Verifica que la URL es `/contacto`.
4. Verifica que el mensaje contiene “Hipnosis Regresiva”.
5. Intercepta el POST a Formspree con `page.route('https://formspree.io/**', route => route.fulfill({ status: 200, body: '{}' }))`.
6. Completa los campos y envía.
7. Verifica el mensaje de éxito.
8. Simula un error y verifica que los datos se conservan y se puede reintentar.

Ejecuta:

```sh
npx playwright test
```

Marca `4.7` como completada.

---

## Fase 5 — SEO, metadatos y compartición

### Tarea 5.1 — Composable de metadatos por ruta

Crea `src/composables/usePageMeta.ts`:

```ts
import { useHead } from '@unhead/vue'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')

export interface PageMeta {
  title: string
  description: string
  path: string
  image?: string
}

export function usePageMeta(meta: PageMeta) {
  const url = `${SITE_URL}${meta.path}`
  const image = meta.image ?? `${SITE_URL}/assets/og/og-image.jpg`

  useHead({
    title: meta.title,
    meta: [
      { name: 'description', content: meta.description },
      { property: 'og:title', content: meta.title },
      { property: 'og:description', content: meta.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [{ rel: 'canonical', href: url }]
  })
}
```

Metadatos sugeridos:

| Ruta | Título | Descripción |
|---|---|---|
| `/` | Hipnosis Regresiva y Regenerativa en Santiago Tolman \| Origen Consciente | Descubre la hipnosis regresiva y regenerativa con Maricela Aguilar Enríquez en Santiago Tolman, Estado de México. Agenda tu sesión. |
| `/servicios` | Servicios de Hipnosis y Sanación Emocional \| Origen Consciente | Hipnosis regresiva, hipnosis regenerativa y terapia de sanación emocional. Conoce duraciones, inversiones y agenda. |
| `/sobre-mi` | Maricela Aguilar Enríquez \| Especialista en Hipnosis | Conoce la trayectoria, filosofía y pilares de Maricela Aguilar Enríquez, especialista en hipnosis regresiva y regenerativa. |
| `/blog` | Blog \| Origen Consciente | Próximamente, contenido sobre hipnosis, bienestar emocional y transformación personal. |
| `/contacto` | Contacto y Agendamiento \| Origen Consciente | Agenda tu sesión de hipnosis en Santiago Tolman, Estado de México. Contáctanos por WhatsApp, correo o formulario. |
| 404 | Página no encontrada \| Origen Consciente | La página que buscas no existe. Vuelve al inicio de Origen Consciente. |

Llama `usePageMeta()` en cada vista con valores únicos. Prueba que títulos y canonical no se repiten.

Marca `5.1` como completada.

### Tarea 5.2 — Prerenderizado con `vite-ssg`

Adapta `src/main.ts`:

```ts
import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import './styles/main.css'

export const createApp = ViteSSG(App, { routes })
```

Conserva las importaciones de fuentes que añadiste en la tarea 1.3. El archivo final debe importar las fuentes, `./styles/main.css` y exportar `createApp`.

Asegúrate de que `src/App.vue` use `<RouterView />` y de que `src/router/index.ts` exporte `routes`.

Actualiza los scripts:

```json
{
  "scripts": {
    "build": "vue-tsc -b && vite-ssg build",
    "preview": "vite preview"
  }
}
```

Verifica:

```sh
npm run build
rg -n "<title>|canonical|og:image|meta name=\"description\"" dist/index.html dist/servicios.html
```

El HTML de cada ruta debe contener título, descripción, canonical y OG sin ejecutar JavaScript.

**Importante:** el HTML prerenderizado se genera en Node. Evita acceder a `window`, `document` o `localStorage` en el nivel superior de componentes y composables; usa guards `typeof window !== 'undefined'`.

Marca `5.2` como completada.

### Tarea 5.3 — Generar `sitemap.xml` y `robots.txt`

Instala `dotenv`:

```sh
npm install -D dotenv
```

Crea `scripts/generate-sitemap.mjs`:

```js
import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = (process.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')
const routes = ['/', '/servicios', '/sobre-mi', '/blog', '/contacto']
const today = new Date().toISOString().slice(0, 10)

const urls = routes
  .map((route) => `  <url><loc>${base}${route}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

mkdirSync('public', { recursive: true })
writeFileSync('public/sitemap.xml', xml)
writeFileSync(
  'public/robots.txt',
  `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
)
```

Añade el script:

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-sitemap.mjs"
  }
}
```

Verifica:

```sh
npm run build
cat dist/sitemap.xml
cat dist/robots.txt
```

Marca `5.3` como completada.

### Tarea 5.4 — Imagen Open Graph

Copia la imagen generada:

```sh
mkdir -p public/assets/og
cp design/generated/og/og-image.jpg public/assets/og/og-image.jpg
```

El composable de 5.1 ya apunta a `${SITE_URL}/assets/og/og-image.jpg`. Verifica que la URL sea absoluta y que la imagen tenga 1200 × 630.

Verifica después del despliegue:

1. Abre `https://developers.facebook.com/tools/debug/`.
2. Pega la URL pública y ejecuta “Scrape Again”.
3. Comprueba título, descripción e imagen.
4. Comparte la URL por WhatsApp y confirma la tarjeta.

Si WhatsApp muestra una vista previa antigua, añade un parámetro de versión (`?v=2`) o espera la caché.

Marca `5.4` como completada.

### Tarea 5.5 — Verificar consistencia de datos de contacto

Después del build:

```sh
rg -n "56 3127 0122|5631270122|mariaguienri88@gmail.com|Santiago Tolman" dist
```

Requisitos:

- El teléfono, correo y ubicación aparecen en todas las páginas relevantes.
- No hay variantes ni placeholders.
- El nombre “Origen Consciente” y el de la especialista son consistentes.

Opcional: crea `scripts/check-contact.mjs` que falle si falta alguno de los datos en el HTML generado y añádelo a `postbuild`.

Marca `5.5` como completada.

---

## Fase 6 — Rendimiento, accesibilidad y entrega

### Tarea 6.1 — Imágenes optimizadas y `srcset`

Copia favicons y OG a `public`:

```sh
mkdir -p public/assets/favicons public/assets/og
cp -R design/generated/favicons/. public/assets/favicons/
cp design/generated/og/og-image.jpg public/assets/og/og-image.jpg
```

En `index.html`:

```html
<link rel="icon" href="/assets/favicons/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicons/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicons/apple-touch-icon-180.png" />
<link rel="manifest" href="/site.webmanifest" />
```

Crea `public/site.webmanifest` con `name`, `short_name`, `icons` (192 y 512) y `theme_color`/`background_color` claros. Si prefieres que el manifest cambie con el tema, genera dos manifests o actualiza el `theme_color` desde `useTheme`; para el MVP basta un manifest estable.

Para el retrato usa `<picture>` con AVIF/WebP/PNG:

```vue
<picture>
  <source :srcset="portraitAvif" type="image/avif" />
  <source :srcset="portraitWebp" type="image/webp" />
  <img
    :src="portraitPng"
    width="224"
    height="248"
    loading="lazy"
    decoding="async"
    alt="Retrato de Maricela Aguilar Enríquez"
  />
</picture>
```

Requisitos:

- Dimensiones explícitas en todas las imágenes.
- `loading="lazy"` fuera de la primera pantalla; logo del hero con `loading="eager"` y `fetchpriority="high"`.
- No amplíes el retrato más allá de 224 × 248.
- Para futuras fotos en alta resolución, instala `vite-imagetools` y genera variantes:

```sh
npm install -D vite-imagetools
```

Verifica el build y que no hay saltos de layout al cargar imágenes.

Marca `6.1` como completada.

### Tarea 6.2 — Fuentes y terceros no bloqueantes

Requisitos:

- Fuentes autoalojadas vía `@fontsource` (importadas en `main.ts`).
- Solo pesos necesarios (400/500/600; itálica 400).
- `font-display: swap` incluido por `@fontsource`.
- El mapa se carga solo al acercarse a la sección (4.6).
- Formspree se llama solo al enviar el formulario.
- Sin scripts de Google Analytics ni píxeles en el MVP.

Verifica con DevTools:

1. Recarga en frío con caché deshabilitada.
2. En la pestaña Network, confirma que el iframe de Google Maps no se solicita hasta hacer scroll.
3. Confirma que no hay solicitudes a `formspree.io` hasta enviar.
4. Revisa que las fuentes no bloquean el primer renderizado.

Marca `6.2` como completada.

### Tarea 6.3 — Auditoría de accesibilidad con axe

Crea `tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const paths = ['/', '/servicios', '/sobre-mi', '/blog', '/contacto']
const themes = ['light', 'dark'] as const

for (const theme of themes) {
  for (const path of paths) {
    test(`sin violaciones en ${theme} ${path}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('oc-theme', value), theme)
      await page.goto(path)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
}
```

Ejecuta:

```sh
npx playwright test tests/e2e/a11y.spec.ts
```

Corrige violaciones serias o críticas. Revisa contraste de texto dorado sobre fondos claros: en tema claro usa `--oc-accent` (`#8A6A1F`), no `--oc-gold`.

Marca `6.3` como completada.

### Tarea 6.4 — Revisión responsive en ambos temas

Añade `tests/e2e/responsive.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

const viewports = [
  { width: 320, height: 800 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 3840, height: 2160 }
]
const paths = ['/', '/servicios', '/sobre-mi', '/blog', '/contacto']
const themes = ['light', 'dark'] as const

for (const theme of themes) {
  for (const viewport of viewports) {
    for (const path of paths) {
      test(`${theme} ${viewport.width}px ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.addInitScript((value) => localStorage.setItem('oc-theme', value), theme)
        await page.goto(path)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
        expect(overflow).toBe(false)
      })
    }
  }
}
```

Ejecuta y revisa manualmente las capturas si algo falla:

```sh
npx playwright test tests/e2e/responsive.spec.ts
```

Marca `6.4` como completada.

### Tarea 6.5 — Despliegue en Vercel

Crea `vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/404.html", "status": 404 }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" }
      ]
    }
  ]
}
```

Requisitos:

- `dist/404.html` debe existir. Si `vite-ssg` no lo genera, crea una ruta 404 estática o ajusta la configuración para generarla.
- Configura en Vercel las variables `VITE_SITE_URL`, `VITE_FORMSPREE_ENDPOINT`, `VITE_GOOGLE_MAPS_EMBED_URL` y `VITE_WHATSAPP_NUMBER`.
- Las variables `VITE_` se incorporan en build; después de cambiarlas, vuelve a desplegar.

Despliega un preview:

```sh
npx vercel
```

Verifica en el preview:

- Rutas directas (`/servicios`, `/sobre-mi`, `/contacto`).
- Formulario (con endpoint de prueba).
- Enlaces de WhatsApp, teléfono y correo.
- 404 devuelve estado 404.
- Tema claro por defecto y persistencia del oscuro.

Si Vercel rechaza combinar `routes` y `headers`, conserva solo `headers` y deja que Vercel sirva `404.html` automáticamente; verifica con `curl -I` que una ruta inexistente devuelve 404.

Marca `6.5` como completada.

### Tarea 6.6 — Presupuesto de rendimiento con Lighthouse CI

Instala:

```sh
npm install -D @lhci/cli
```

Crea `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://127.0.0.1:4173/",
        "http://127.0.0.1:4173/servicios",
        "http://127.0.0.1:4173/sobre-mi",
        "http://127.0.0.1:4173/contacto"
      ],
      "startServerCommand": "npm run preview -- --port 4173",
      "startServerReadyPattern": "Local:",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Añade el script:

```json
{
  "scripts": {
    "lighthouse": "lhci autorun"
  }
}
```

Ejecuta:

```sh
npm run build
npm run lighthouse
```

**Nota:** Lighthouse mide TBT como proxy de laboratorio de INP. Para validar INP real, usa Web Vitals en producción o una herramienta RUM. No cambies el umbral de la especificación; documenta la diferencia.

Marca `6.6` como completada.

### Tarea 6.7 — README del proyecto

Crea `README.md` en la raíz con estas secciones:

1. Descripción del proyecto.
2. Requisitos (Node >= 20.19).
3. Instalación (`npm install`).
4. Variables de entorno (tabla con `.env.example`).
5. Comandos (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `lighthouse`).
6. Edición de contenido (`src/content/`).
7. Assets de marca (`design/generated/` y cómo copiarlos).
8. Temas claro/oscuro (claro por defecto, `oc-theme`, `data-theme`).
9. Despliegue en Vercel.
10. Verificación y pruebas.

Verifica que los comandos documentados funcionan tal como están escritos.

Marca `6.7` como completada.

---

## Fase 7 — Verificación de integración y lanzamiento

### Tarea 7.1 — Ejecutar toda la cadena de verificación

```sh
npm ci
npm run lint
npm run typecheck
npm run test
npx playwright test
npm run build
```

**Criterio de aceptación:** todos los comandos terminan sin errores.

Marca `7.1` como completada.

### Tarea 7.2 — Recorrer los escenarios de las especificaciones

Lista todos los escenarios:

```sh
rg -n "^### Requirement:|^#### Scenario:" openspec/changes/origen-consciente-website/specs
```

Recorre cada `#### Scenario:` en el preview de producción o en `npm run preview`, en tema claro y oscuro. Como mínimo verifica:

- **design-system:** tema claro por defecto, cambio a oscuro, persistencia, sin FOUC, contraste en ambos temas, tipografía, ornamentos, componentes, responsive y movimiento reducido.
- **site-shell:** navbar sticky, menú móvil, sección activa, blog próximamente, footer, control de tema accesible.
- **home-landing:** hero, CTAs, vista previa de la especialista, resumen de servicios y enlaces.
- **service-catalog:** tres servicios, duración, inversión, CTA y retícula responsive.
- **professional-profile:** nombre, cargo, foto con marco, historia, filosofía, tres pilares y CTA.
- **contact-booking:** campos, validación, errores accesibles, envío, WhatsApp, correo, mapa y respaldo textual.
- **seo-metadata:** títulos únicos, descripciones locales, canonical, OG, sitemap, robots y datos consistentes.
- **site-performance:** carga, LCP, CLS, INP/TBT, imágenes, fuentes y terceros.
- **site-delivery:** HTTPS, rutas directas, 404, headers y despliegue.

Registra el resultado en `openspec/changes/origen-consciente-website/verification.md` si quieres dejar constancia.

Marca `7.2` como completada.

### Tarea 7.3 — Smoke test de lanzamiento

Con el dominio final configurado:

```sh
curl -I https://TU-DOMINIO
curl -I http://TU-DOMINIO
curl -sS https://TU-DOMINIO/ | rg -n "og:image|canonical|description|Hipnosis"
curl -sS https://TU-DOMINIO/sitemap.xml
curl -sS https://TU-DOMINIO/robots.txt
curl -I https://TU-DOMINIO/ruta-inexistente
```

Verifica manualmente:

- Envío real del formulario al correo.
- Apertura de WhatsApp con el mensaje exacto.
- Apertura del cliente de correo.
- Mapa en tema claro y oscuro.
- Vista previa OG en Facebook y WhatsApp.
- 404 con estado 404.
- HTTPS y redirección HTTP → HTTPS.
- Persistencia del tema tras recargar y en una nueva pestaña.
- Acceso desde un móvil real.

Marca `7.3` como completada.

### Tarea 7.4 — Publicar en el dominio definitivo

```sh
npx vercel --prod
```

En Vercel:

1. Añade el dominio definitivo.
2. Configura los registros DNS indicados.
3. Espera la emisión del certificado SSL.
4. Verifica `https://TU-DOMINIO` y la redirección desde `http://`.
5. Confirma que las variables de entorno de producción están configuradas.

Marca `7.4` como completada.

---

## Cierre del cambio OpenSpec

Cuando las 43 tareas estén marcadas y verificadas:

```sh
openspec validate origen-consciente-website --strict
openspec list
openspec instructions apply --change origen-consciente-website
```

Si todo está correcto y el lanzamiento fue aprobado:

```sh
openspec archive origen-consciente-website
```

Después del archivado, revisa que las especificaciones principales en `openspec/specs/` reflejen las capacidades implementadas.
