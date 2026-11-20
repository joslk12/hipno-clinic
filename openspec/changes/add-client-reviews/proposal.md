# Proposal

## Why

El sitio no ofrece una forma de que las clientas compartan su experiencia ni de mostrar prueba social actualizada. Las reseñas ayudan a que nuevas personas confíen en el servicio y a que el contenido del sitio se renueve sin trabajo manual.

## What Changes

- Nueva página `/resenas` con promedio de calificación, listado de reseñas publicadas y formulario para dejar una reseña con nombre, calificación de 1 a 5 estrellas, texto y consentimiento de publicación.
- Nueva API en Netlify Functions (`GET`/`POST /api/reviews`) respaldada por Netlify Blobs. Las reseñas limpias se publican automáticamente; las sospechosas quedan pendientes de revisión.
- Filtros antispam: honeypot, validación de campos, detección de enlaces/términos sospechosos y límite de envíos por IP.
- Endpoints administrativos protegidos por token para aprobar reseñas pendientes y eliminar reseñas publicadas.
- Nuevo enlace "Reseñas" en la navegación, metadatos SEO, sitemap y documentación de despliegue.
- **BREAKING** para el despliegue: el sitio deja de poder publicarse arrastrando solo `dist`; las Functions requieren Netlify CLI o un build conectado a repositorio.

## Capabilities

### New Capabilities

- `client-reviews`: recepción, moderación automática, almacenamiento y publicación de reseñas de clientas, incluida la página pública y la API.

### Modified Capabilities

- Ninguna.

## Impact

- Código nuevo: `src/views/ReviewsView.vue`, `src/components/sections/ReviewForm.vue`, `src/components/sections/ReviewList.vue`, `src/components/ui/StarRating.vue`, `src/content/reviews.ts`, `src/services/reviews.ts`, `netlify/functions/reviews.ts`.
- Cambios: router, navegación, metadatos de páginas, sitemap, validación SEO, CSP si hace falta, README, `netlify.toml` y pruebas unitarias/E2E.
- Dependencias: `@netlify/blobs` y `@netlify/functions`.
- Configuración: `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT` en Netlify; despliegue con `npx netlify-cli deploy --prod`.
- Datos: Netlify Blobs almacena reseñas y contadores de límite por IP; no se guardan IPs en claro.
