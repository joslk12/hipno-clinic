# Proposal

## Why

El blog es hoy un aviso de "contenido próximamente". El dueño necesita publicar artículos sin depender de un desarrollador, y cada artículo debe tener URL propia, metadatos para compartir y presencia en el sitemap.

## What Changes

- Nueva área privada `/admin/blog` con inicio de sesión por contraseña, sesión en cookie HttpOnly y editor de artículos en Markdown con vista previa.
- Gestión de artículos: borradores, publicación, despublicación, edición, eliminación, slug automático y subida de imágenes.
- Nueva API administrativa en Netlify Functions respaldada por Netlify Blobs para artículos e imágenes; el HTML se sanea al guardar.
- Nueva API pública de artículos publicados que alimenta el build y el sitemap.
- Blog público real: `/blog` con listado y `/blog/:slug` con artículo completo, metadatos por artículo, Open Graph, canonical y sitemap.
- Publicación con rebuild de Netlify: al publicar, editar o eliminar un artículo publicado se dispara un build hook; el artículo aparece cuando termina el rebuild.
- Nuevas variables `BLOG_ADMIN_PASSWORD`, `BLOG_SESSION_SECRET` y `BLOG_BUILD_HOOK_URL`.
- **BREAKING** para el flujo de publicación: el blog requiere Netlify Functions y un build hook; arrastrar solo `dist` no actualiza artículos.

## Capabilities

### New Capabilities

- `blog`: administración segura de artículos, edición en Markdown, imágenes, borradores, publicación, generación estática del blog público y metadatos por artículo.

### Modified Capabilities

- Ninguna.

## Impact

- Código nuevo: `src/views/admin/AdminBlogView.vue`, `src/components/admin/*`, `src/views/BlogView.vue`, `src/views/BlogPostView.vue`, `src/content/blog.ts`, `src/content/generated/blog.json`, `netlify/functions/admin.ts`, `netlify/functions/blog-posts.ts`, `netlify/functions/blog-image.ts`, `netlify/lib/blog/*`, `scripts/generate-blog-data.mjs`.
- Cambios: router, `vite.config.ts`, sitemap, robots, validación SEO, `netlify.toml`, `package.json`, README, CSP si hiciera falta.
- Dependencias: `@netlify/blobs`, `@netlify/functions`, `marked`, `dompurify` y `sanitize-html`.
- Configuración: contraseña administrativa, secreto de sesión, build hook y URL de la API para builds locales.
- Seguridad: contraseña y secreto solo en el servidor; cookie HttpOnly/Secure/SameSite=Strict; contenido saneado; `/admin` excluido de buscadores.
