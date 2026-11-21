# Origen Consciente

Sitio web de Origen Consciente: hipnosis regresiva, regenerativa y sanación emocional en Santiago Tolman, Estado de México.

Aplicación estática generada con Vue 3 + TypeScript + Vite, prerenderizada con `vite-ssg` para que los metadatos y las tarjetas Open Graph funcionen sin JavaScript. El formulario de contacto usa Netlify Forms y las reseñas usan Netlify Functions + Netlify Blobs.

## Stack

- Vue 3 (Composition API, `<script setup>`)
- TypeScript y Vite
- `vite-ssg` (prerenderizado de rutas)
- Vue Router y Pinia
- Tailwind CSS
- Vitest y Playwright
- `@unhead/vue` para metadatos por ruta

## Requisitos

- Node.js 22.12 o superior (Vite 8 requiere `^20.19.0 || >=22.12.0`)
- npm

## Instalación

```bash
npm install
cp .env.example .env.local
```

Edita `.env.local` con los valores del entorno local.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_SITE_URL` | Sí | URL pública absoluta del sitio. Se usa en canonical, Open Graph, sitemap y robots. Por defecto: `https://origenconsciente.mx`. |
| `VITE_GOOGLE_MAPS_EMBED_URL` | Sí | URL del mapa embebido de Google Maps. Si falta, se muestra el respaldo textual con enlace a Google Maps. |
| `VITE_WHATSAPP_NUMBER` | Sí | Número de WhatsApp en formato internacional sin signos (ej. `525631270122`). |
| `REVIEWS_ADMIN_TOKEN` | Sí (funciones) | Token secreto para moderar reseñas (`PATCH`/`DELETE`). |
| `REVIEWS_RATE_SALT` | Sí (funciones) | Sal secreta para hashear IPs y aplicar el límite de 3 reseñas por IP/24 h. |
| `RESEND_API_KEY` | Sí (envío) | Clave de la API de Resend para enviar las ligas por correo. |
| `REVIEWS_FROM_EMAIL` | Sí (envío) | Remitente verificado de Resend, p. ej. `Origen Consciente <hola@origenconsciente.mx>`. |

El envío de WhatsApp es manual: desde `/admin/resenas` se genera la liga y un mensaje listo para copiar o abrir con `wa.me`, usando el WhatsApp personal de la clínica. No se necesita WhatsApp Business ni Cloud API.

En Netlify, define las mismas variables en **Site configuration → Environment variables**. `VITE_SITE_URL` debe coincidir con el dominio final para que canonical, OG y sitemap sean correctos.

`BLOG_API_URL`, `VITE_WHATSAPP_NUMBER` y `VITE_SITE_URL` son valores públicos. Si las marcas como secretos, el escaneo de Netlify fallará el build porque esos valores también viven en el código y el sitemap; `netlify.toml` ya las excluye del escaneo mediante `SECRETS_SCAN_OMIT_KEYS`. El resto de variables sí deben ir marcadas como secretas.

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Typecheck + prerender + sitemap + validaciones
npm run preview      # Preview del build en http://localhost:4173
npm run typecheck    # vue-tsc
npm run lint         # ESLint
npm run lint:fix     # ESLint con corrección automática
npm run format       # Prettier
npm run test         # Pruebas unitarias (Vitest)
npm run test:watch   # Vitest en modo watch
npm run dev:netlify  # Netlify Dev (incluye Functions y Blobs locales)
npm run deploy       # Build + deploy a producción con Netlify CLI
```

Pruebas E2E (requieren navegador de Playwright):

```bash
npx playwright install chromium
npx playwright test
```

`npm run build` ejecuta además:

- `prebuild`: genera `public/sitemap.xml` y `public/robots.txt` a partir de `VITE_SITE_URL`.
- `postbuild`: valida datos de contacto en todas las páginas y metadatos SEO/OG en el HTML generado.

## Edición de contenido

El contenido editable vive en `src/content/`:

| Archivo | Contenido |
| --- | --- |
| `site.ts` | Nombre, subtítulo, slogan y datos generales del sitio. |
| `services.ts` | Servicios, descripciones, duraciones e inversiones. |
| `profile.ts` | Perfil de la especialista, trayectoria, filosofía y pilares. |
| `contact.ts` | Teléfono, correo, ubicación, coordenadas y enlaces de contacto. |
| `navigation.ts` | Enlaces de la navegación principal y del footer. |
| `pages.ts` | Títulos, descripciones y rutas para SEO/OG. |

Los componentes y vistas consumen estos archivos; evita duplicar datos en las plantillas.

## Assets

- `src/assets/brand/`: logos, iconos, ornamentos y fotografías importados por los componentes. Vite los procesa y versiona en el build.
- `public/assets/`: favicons y `og-image.jpg` (1200×630). Se copian tal cual a `dist/`.

## Formulario de contacto

El sitio usa **Netlify Forms** con el formulario `contact`:

- El formulario visible está en `src/components/sections/ContactForm.vue`.
- `index.html` incluye un formulario oculto con `data-netlify="true"` para que Netlify detecte los campos durante el build.
- El envío se hace con `fetch` a `/` usando `application/x-www-form-urlencoded` e incluye `form-name=contact`.
- Hay un honeypot invisible (`bot-field`) para reducir spam.

En `npm run dev` no hay backend de Netlify, por lo que el envío fallará; usa `netlify dev` o prueba en un deploy de Netlify.

Las etiquetas que aparecen en el correo de notificación provienen del texto de los `<label>` que envuelven cada campo.

## Reseñas de clientas

Las reseñas ya no se aceptan desde un formulario público. Solo se pueden publicar desde una liga privada que el admin envía a un cliente registrado. La página `/resenas` sigue mostrando el promedio y las reseñas aprobadas; el formulario aparece únicamente cuando la liga es vigente.

### Panel `/admin/resenas`

Requiere la misma sesión que `/admin/blog` (`BLOG_SESSION_SECRET`). El flujo es:

1. **Nuevo cliente**: nombre y al menos un medio de contacto válido (correo y/o WhatsApp con código de país).
2. **Elegir cliente** y marcar los canales deseados.
3. **ENVIAR LIGA**: se genera un token opaco de 32 bytes, se guarda solo su hash SHA-256 y se envía `/resenas?token=<token>` por Resend y/o WhatsApp Cloud API.
4. El resultado se registra por canal. Si un proveedor falla, el registro queda `pendiente` y se puede reintentar.
5. Cuando la liga se canjea o expira (30 días), **REENVIAR (NUEVA LIGA)** crea un token nuevo y deja el anterior inactivo.

La plantilla de WhatsApp debe aprobarse en Meta antes de habilitar ese canal: nombre `review_invitation`, idioma `es_MX`, con dos variables de cuerpo (`{{1}}` = nombre, `{{2}}` = liga). El envío siempre lo inicia el admin; nunca es automático.

### APIs

- `GET /api/reviews`: hasta 50 reseñas aprobadas con `summary.average` y `summary.count`.
- `POST /api/reviews`: valida los campos de siempre **y exige `invitationToken`**. Token ausente → `401`; ya canjeado → `403`; carrera de canjeo → `409`.
- `GET /api/reviews?status=pending`, `PATCH /api/reviews`, `DELETE /api/reviews?id=...`: moderación con `Authorization: Bearer $REVIEWS_ADMIN_TOKEN`.
- `GET/POST/PATCH/DELETE /api/admin/review-clients`: CRUD de clientes (sesión administrativa).
- `GET/POST /api/admin/review-invitations`: listado y envío/reenvío (sesión administrativa).
- `GET /api/reviews/invitation?token=...`: devuelve solo `{ "valid": boolean }`, sin datos del cliente.

Moderación con `curl`:

```bash
curl -s "https://TU-SITIO.netlify.app/api/reviews?status=pending" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN"

curl -s -X PATCH "https://TU-SITIO.netlify.app/api/reviews" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"ID_DE_LA_RESENA","status":"approved"}'

curl -s -X DELETE "https://TU-SITIO.netlify.app/api/reviews?id=ID_DE_LA_RESENA" \
  -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN"
```

En local, `npm run dev` no ejecuta Functions; usa `npm run dev:netlify` y define todas las variables anteriores en `.env.local`.

Al sincronizar specs, primero debe existir la spec base `client-reviews` del change `add-client-reviews` y después aplicarse el delta `MODIFIED` de `add-review-invitations`.

## SEO y compartición

- Cada vista llama a `usePageMeta` con sus datos de `src/content/pages.ts`.
- `vite-ssg` prerenderiza `/`, `/servicios`, `/sobre-mi`, `/resenas`, `/blog`, `/contacto` y `/404`.
- `scripts/generate-sitemap.mjs` genera sitemap y robots.
- `scripts/check-seo.mjs` valida título, descripción, canonical, OG e imagen en el HTML generado.
- La imagen Open Graph es `public/assets/og/og-image.jpg`.

La verificación con el depurador de Facebook/WhatsApp queda pendiente hasta que el dominio final tenga DNS y HTTPS.

## Estructura

```text
src/
  components/
    layout/     # AppShell, navbar, footer, menú móvil
    sections/   # Hero, servicios, perfil, contacto, mapa
    ui/         # Botones, inputs, logos, iconos, ornamentos
  composables/  # Tema, metadatos
  content/      # Contenido editable
  router/       # Rutas públicas
  services/     # Envío del formulario y API de reseñas
  stores/       # Estado de agendamiento
  styles/       # Tokens y estilos globales
  views/        # Páginas
netlify/        # Functions y librería de reseñas
public/         # Favicons, OG, robots y sitemap
scripts/        # Generación y validación en build
tests/e2e/      # Playwright: flujo, accesibilidad, responsive, red
```

## Despliegue en Netlify

El archivo `netlify.toml` define:

- Comando de build: `npm run build`
- Directorio publicado: `dist`
- Node.js 22
- Functions en `netlify/functions` y el redirect `/api/reviews` → `/.netlify/functions/reviews`

Los headers de seguridad (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`) se declaran en `public/_headers`, que Vite copia a `dist/_headers`. Así se aplican también en deploys por CLI o arrastrando la carpeta `dist`, no solo en builds desde repositorio.

Netlify aplica HTTPS automáticamente. Las rutas directas funcionan porque cada página se genera como HTML estático y Netlify sirve `404.html` para rutas inexistentes.

Las Functions requieren un build desde el repositorio conectado o un deploy con Netlify CLI (`npm run deploy`). Arrastrar solo la carpeta `dist` no publica Functions, por lo que `/api/reviews` no funcionará en ese tipo de deploy.

Para el dominio definitivo:

1. Compra/configura el dominio y agrégalo en Netlify.
2. Verifica el certificado SSL y la redirección HTTP → HTTPS.
3. Confirma que `VITE_SITE_URL` apunta al dominio final y vuelve a desplegar.
4. Verifica la vista previa OG con los depuradores de Facebook/WhatsApp.
