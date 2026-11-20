# Design

## Context

El sitio es una SPA Vue 3 prerenderizada con `vite-ssg` y desplegada en Netlify. El blog actual es un placeholder. El dueño necesita publicar sin tocar código, con URLs estáticas indexables y una espera de rebuild aceptada (1–2 minutos).

## Goals / Non-Goals

### Goals

- Panel privado simple, de una sola persona, con contraseña y sesión segura.
- Artículos en Markdown con vista previa, imágenes y borradores.
- Blog público estático con metadatos únicos por artículo.
- Publicación que dispare un rebuild de Netlify.
- Fallback seguro si la API o el panel no están disponibles durante el build.
- Mantener el resto del sitio sin dependencia de Functions en tiempo de ejecución.

### Non-Goals

- Multiusuario, roles o permisos granulares.
- Editor WYSIWYG, comentarios, RSS, etiquetas, búsqueda o programación de publicaciones.
- Redimensionado u optimización automática de imágenes.
- Redirecciones automáticas al cambiar un slug.
- Historial de versiones o exportación/importación masiva.
- Edición del sitio fuera del blog.

## Decisions

### 1. Netlify Functions + Netlify Blobs

- Una Function por endpoint, con `config.path` exacto; sin depender de redirects con `:splat`.
- Blobs con consistencia fuerte para lecturas inmediatas tras guardar.
- Dos tipos de clave en el store `blog`: `post:<uuid>` e `image:<uuid>`. Las claves de tasa usan `rate:`.
- Las imágenes se sirven por una Function pública con `Cache-Control: public, max-age=31536000, immutable`; las claves son UUID, por lo que son inmutables.

### 2. Autenticación de una sola contraseña

- `BLOG_ADMIN_PASSWORD` y `BLOG_SESSION_SECRET` solo en el servidor.
- Comparación de contraseña con SHA-256 y `timingSafeEqual` para evitar filtraciones por tiempo.
- Token de sesión propio: payload `{ exp }` + firma HMAC-SHA256, en Base64URL. Sin dependencia JWT.
- Cookie `oc_admin_session` con `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Max-Age=28800`. En `netlify dev` se omite `Secure` para permitir HTTP local.
- Límite de 5 intentos fallidos por IP cada 15 minutos; la IP se hashea antes de guardarla.
- Verificación de `Origin` en métodos mutantes como defensa CSRF adicional.
- Si faltan variables, el login responde `503`; el blog público sigue funcionando.

### 3. Markdown saneado en el servidor

- `marked` convierte Markdown a HTML; `sanitize-html` elimina etiquetas y atributos peligrosos.
- Se guardan `contentMarkdown` y `contentHtml`; el público solo consume `contentHtml`.
- Se permiten encabezados, párrafos, listas, enlaces `http`/`https`/`mailto`, imágenes `http`/`https`/relativas, código, citas, `strong`, `em`, `hr` y `br`.
- Se eliminan `script`, `style`, `iframe`, manejadores `on*` y esquemas `javascript:`.
- El renderer añade `loading="lazy"` y `decoding="async"` a las imágenes.
- La vista previa del editor usa `marked` + `DOMPurify`; el detalle público vuelve a sanear con `DOMPurify` como defensa en profundidad.

### 4. Datos de build vía API pública

- `GET /api/blog/posts` devuelve solo publicados y el HTML saneado.
- `scripts/generate-blog-data.mjs` corre en `prebuild`, consulta `BLOG_API_URL || URL` y escribe `src/content/generated/blog.json`.
- Si la consulta falla, conserva el JSON existente, registra una advertencia y el build continúa.
- `vite.config.ts` lee el JSON para añadir `/blog/<slug>` a `includedRoutes`; `/admin` queda fuera de las rutas prerenderizadas públicas y se marca `noindex`.
- El sitemap lee el mismo JSON y añade los artículos. `robots.txt` desautoriza `/admin`.
- Para E2E se usa un fixture mediante `BLOG_DATA_FILE` y `BLOG_SKIP_FETCH=1`; el alias `@blog-data` evita modificar el JSON de producción.

### 5. Publicación con build hook

- `BLOG_BUILD_HOOK_URL` se llama al publicar, editar un publicado, despublicar o eliminar un publicado.
- Guardar o editar borradores no dispara el build.
- Si el hook falla o no existe, el artículo se guarda y la API devuelve una advertencia; la UI explica que se puede reconstruir manualmente.
- La UI muestra “Publicación en proceso; el artículo aparecerá en 1–2 minutos” cuando el hook se dispara.

### 6. Despliegue con Netlify CLI o build conectado

- Functions y Blobs requieren un despliegue de Netlify con build, no solo arrastrar `dist`.
- `npm run deploy` usa `npx netlify-cli deploy --build --prod`.
- `netlify dev` permite probar Functions localmente; las variables van en `.env` (ignorado por git).
- El build hook se crea en Netlify y se guarda como variable de entorno.

## Architecture

```text
Navegador (público)
  /blog, /blog/:slug  -> JSON generado en build (sin fetch en runtime)
  imágenes            -> GET /api/blog/images?key=image:<uuid>

Navegador (dueño)
  /admin/blog         -> SPA + fetch same-origin
  /api/admin/login    -> Function admin-login
  /api/admin/session  -> Function admin-session
  /api/admin/logout   -> Function admin-logout
  /api/admin/blog/posts   -> Function admin-posts (GET/POST/PATCH/DELETE)
  /api/admin/blog/images  -> Function admin-images (POST)
  /api/admin/blog/build   -> Function admin-build (POST, opcional)

Netlify Blobs (store "blog")
  post:<uuid>   -> BlogPostRecord (JSON)
  image:<uuid>  -> bytes + metadata { contentType, originalName }
  rate:<hash>:<window> -> contador de login

Build de Netlify
  prebuild -> GET /api/blog/posts -> src/content/generated/blog.json
  vite-ssg -> /blog y /blog/<slug> estáticos
  sitemap  -> incluye artículos
```

## Data Model

```ts
type BlogStatus = 'draft' | 'published'

interface BlogPostRecord {
  id: string
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  contentHtml: string
  coverImage: string | null
  status: BlogStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

interface PublicBlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  contentHtml: string
  coverImage: string | null
  publishedAt: string
  updatedAt: string
}
```

Reglas:

- `title`: 3–120 caracteres.
- `excerpt`: 40–200 caracteres; la UI puede generarlo desde el contenido, pero se guarda explícito.
- `contentMarkdown`: 50–20 000 caracteres.
- `slug`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, máximo 80; único; reservados `blog`, `admin`, `api`, `servicios`, `sobre-mi`, `contacto`, `resenas`.
- `coverImage`: `null` o URL same-origin `/api/blog/images?key=...`.
- `publishedAt`: se fija la primera vez que se publica y se conserva al despublicar/republicar.
- `updatedAt`: se actualiza en cada cambio.

## API

### Públicas

- `GET /api/blog/posts` → `PublicBlogPost[]` ordenados por `publishedAt` descendente. Solo publicados.
- `GET /api/blog/images?key=image:<uuid>` → bytes con `Content-Type`, `ETag` y caché inmutable. `400` si la clave no es de imagen; `404` si no existe.

### Administrativas (cookie válida salvo login)

- `POST /api/admin/login` `{ password }` → `{ ok: true }` + cookie. `401` incorrecto, `429` limitado, `503` sin configuración.
- `POST /api/admin/logout` → `{ ok: true }` + cookie expirada.
- `GET /api/admin/session` → `{ authenticated: true }` o `401`.
- `GET /api/admin/blog/posts` → `{ posts: BlogPostRecord[] }` (borradores y publicados).
- `POST /api/admin/blog/posts` → `201 { post, build }`.
- `PATCH /api/admin/blog/posts?id=<id>` → `{ post, build }`.
- `DELETE /api/admin/blog/posts?id=<id>` → `{ ok: true, build }`.
- `POST /api/admin/blog/images` `multipart/form-data` campo `file` → `{ url, key }`.
- `POST /api/admin/blog/build` → `{ triggered, warning? }` (reconstrucción manual).

`build` es `{ triggered: boolean, warning?: string }`. Los errores usan `{ error, fields? }` y códigos `400`, `401`, `403`, `404`, `409`, `429`, `503`.

## Markdown y saneado

- `marked` con `gfm: true`, `breaks: true`, `async: false`.
- `sanitize-html` con lista blanca de etiquetas/atributos; sin `style`, sin `class` salvo `language-*` en `code`.
- Enlaces externos se conservan; no se abre `target="_blank"` por defecto.
- La vista previa usa `DOMPurify.sanitize` antes de `v-html`.
- Pruebas obligatorias: script, iframe, `javascript:`, `onerror`, imagen válida, enlace válido.

## Frontend

### Público

- `src/content/blog.ts` importa `@blog-data`, ordena y expone `blogPosts` y `getPostBySlug`.
- `BlogView.vue`: listado con tarjetas (título, extracto, fecha, portada opcional), estado vacío y enlace a cada artículo.
- `BlogPostView.vue`: título, fecha, portada, HTML saneado, enlace de vuelta y `usePageMeta` con datos del artículo. Slug inexistente → 404.
- `usePageMeta` resuelve imágenes relativas contra `SITE_URL` y admite `type: 'article'` para Open Graph.
- Fechas con `Intl.DateTimeFormat('es-MX', { dateStyle: 'long' })` en UTC.

### Administración

- `src/views/admin/AdminBlogView.vue` con estados `login`, `list`, `edit`.
- Login con contraseña, error y `aria-live`; sesión verificada con `/api/admin/session`.
- Lista con título, estado, fecha de modificación y acciones.
- Editor: título, slug (auto desde título, editable), extracto, portada, Markdown, barra de herramientas y vista previa.
- Barra: negritas, cursivas, título, lista, enlace e imagen; inserta sintaxis en la selección.
- Subida de imagen inmediata; inserta `![alt](url)` o asigna portada.
- Acciones: guardar borrador, publicar, despublicar, eliminar (con confirmación) y reconstruir.
- Mensajes de build y advertencias en región live.
- `noindex, nofollow` con `useHead`; no se enlaza desde navegación pública.

## Deployment

- `netlify.toml`: `[functions] directory = "netlify/functions"`, `node_bundler = "esbuild"`; Node 22.
- Variables: `BLOG_ADMIN_PASSWORD`, `BLOG_SESSION_SECRET` (32+ caracteres), `BLOG_BUILD_HOOK_URL`; opcional `BLOG_API_URL` para builds locales.
- Scripts: `deploy` con `npx netlify-cli deploy --build --prod`; `dev:netlify` con `npx netlify-cli dev`.
- README: crear build hook, configurar variables, entrar a `/admin/blog`, publicar y esperar el rebuild, límites de imagen y backup.
- Rollback: revertir el deploy; los artículos permanecen en Blobs.

## Security

- Contraseña y secreto solo en el servidor; nunca en el bundle.
- Cookie HttpOnly/Secure/SameSite=Strict; expiración 8 h; logout la invalida.
- Rate limit de login y verificación de `Origin`.
- HTML saneado en servidor y cliente.
- `/admin` con `noindex` y `robots.txt` desautorizado.
- Imágenes con MIME validado, tamaño máximo 5 MB y claves UUID no adivinables.
- No se registran contraseñas, cookies, tokens ni contenido de artículos en logs.
- CSP existente se mantiene: API e imágenes son same-origin.

## Testing

- Unitarias: `slugify`, validación, saneado, sesión (firma/expiración), cookies, rate limit, servicio de posts, mapeo público, lógica de build hook, `usePageMeta` con imagen relativa.
- Componentes: login, lista, editor, vista previa, subida, guardado, blog público con y sin artículos, detalle y 404.
- E2E: login/CRUD/publicación con APIs mockeadas; blog público con fixture `tests/fixtures/blog.json`; a11y y responsive para `/blog` y `/blog/<slug>`.
- Build: `BLOG_DATA_FILE=tests/fixtures/blog.json BLOG_SKIP_FETCH=1 npm run build` debe generar artículos, sitemap y pasar `check-seo`.
- Verificación final: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, Playwright.

## Risks / Trade-offs

- **Espera de rebuild**: el artículo no aparece al instante; se comunica en la UI. Alternativa futura: render en runtime o ISR.
- **Datos en Blobs**: sin exportación inicial; se documenta copia manual y se puede añadir exportación después.
- **Imágenes huérfanas**: eliminar un artículo no borra sus imágenes; se documenta y se deja para una limpieza futura.
- **Slug cambiado**: rompe enlaces existentes; no hay redirecciones en esta versión.
- **Límite de payload**: 5 MB deja margen bajo el límite de Functions; se valida en cliente y servidor.
- **Dependencia de Netlify**: Functions/Blobs atan el blog a Netlify; el sitio público sigue estático.
- **Acumulación de claves de rate limit**: impacto menor; se pueden limpiar por prefijo en el futuro.

## Migration / Rollout

1. Añadir `src/content/generated/blog.json` con `[]` y el alias de datos.
2. Implementar Functions y probar con `netlify dev`.
3. Configurar variables y build hook en Netlify.
4. Desplegar con CLI; verificar login, subida, publicación y rebuild.
5. Publicar el primer artículo y validar SEO, sitemap y 404.
6. Documentar el flujo y el rollback.

## Open Questions

- Ninguna pendiente para esta versión.
