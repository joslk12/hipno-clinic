# Design

## Context

El sitio es una aplicación Vue 3 prerenderizada con `vite-ssg`, servida como estático en Netlify. No tiene backend ni base de datos; el formulario de contacto usa Netlify Forms. La CSP actual permite `connect-src 'self'` y el sitio evita requests de terceros en la primera carga. El despliegue actual se hace arrastrando `dist`, pero las Functions requieren Netlify CLI o un build conectado a repositorio. Ver `proposal.md` para la motivación y `specs/client-reviews/spec.md` para el contrato de comportamiento.

## Goals / Non-Goals

**Goals:**

- Publicar y listar reseñas sin servicios de terceros ni cambios en la CSP.
- Mantener el sitio estático para el resto de páginas aunque la API falle.
- Publicar automáticamente reseñas limpias y retener spam para revisión.
- Permitir moderación administrativa sin exponer el token en el cliente.

**Non-Goals:**

- Panel de administración visual; la moderación inicial será por API documentada.
- Notificaciones por correo de nuevas reseñas.
- Edición pública de reseñas o respuestas de la especialista.
- Paginación avanzada o búsqueda de reseñas.

## Decisions

### Netlify Functions v2 + Netlify Blobs

Se usa una Function en `netlify/functions/reviews.ts` y Netlify Blobs para persistencia. Evita un proveedor externo, mantiene las peticiones en el mismo origen y no requiere cambios de CSP. Alternativas descartadas: Supabase/Firebase (cuenta, claves y requests externos), Netlify Forms (no permite lectura pública ni moderación por API) y un servicio de comentarios (requiere cuenta de terceros para las clientas).

### Una Function para lectura, creación y moderación

`GET`, `POST`, `PATCH` y `DELETE` se atienden en `/api/reviews` mediante un redirect de `netlify.toml` hacia `/.netlify/functions/reviews`. `GET` con `?status=pending` lista pendientes para moderación; `PATCH` recibe `{ id, status: 'approved' }`; `DELETE` recibe `?id=`. Así se evita duplicar validación y configuración.

### Almacenamiento por reseña y contador por IP

Cada reseña se guarda como un blob JSON independiente (`review:<id>`), lo que evita condiciones de carrera de un arreglo único. La lectura lista el prefijo, filtra aprobadas, ordena por fecha y limita a 50. El límite de envíos usa `rate:<hash>:<YYYY-MM-DD>` con un hash SHA-256 de la IP y una sal de entorno; nunca se guarda la IP en claro. Alternativa descartada: un solo blob `reviews.json` (lectura-modificación-escritura con pérdida potencial de datos).

### Filtro antispam sin CAPTCHA

Se combinan honeypot, validación estricta, detección de URLs/términos sospechosos y límite de tres envíos por IP cada 24 horas. Las reseñas limpias se publican; las sospechosas quedan pendientes. Un CAPTCHA añadiría un tercero, fricción y una dependencia externa; el filtro actual es suficiente para el volumen esperado y el administrador puede eliminar contenido.

### Autenticación administrativa por token

Los endpoints administrativos exigen `Authorization: Bearer <REVIEWS_ADMIN_TOKEN>` y comparan con `timingSafeEqual`. El token solo existe en el entorno de Netlify. Si falta, responden `503`. La moderación inicial se documenta con `curl`; un panel visual queda fuera de alcance.

### Página cliente con carga bajo demanda

`/resenas` se prerenderiza con su estructura y metadatos; las reseñas se cargan al montar mediante `GET /api/reviews`. Esto mantiene el build estático y permite mostrar estados de carga, vacío, error y reintento. La API no se consulta en la primera carga del resto del sitio.

### Componentes y accesibilidad

Se crean `ReviewsView.vue`, `ReviewForm.vue`, `ReviewList.vue` y `StarRating.vue`. La calificación usa un `fieldset` con `legend` y radios nativos; las estrellas son decorativas y el valor se comunica en texto ("4 de 5 estrellas"). Errores y confirmaciones usan `role="alert"`/`role="status"` y `aria-live`. El foco va al primer campo inválido.

### Metadatos, sitemap y navegación

Se agrega `pageMeta.reviews`, el enlace en `navLinks` y la ruta `/resenas`. `generate-sitemap.mjs` y `check-seo.mjs` incluyen la nueva ruta. El enlace aparece en escritorio y menú móvil por compartir `navLinks`.

### Pruebas

El handler se prueba con un almacén falso inyectado para validar creación, spam, límite, lectura y autorización. Los servicios y componentes se prueban con Vitest. Los E2E interceptan `/api/reviews` para probar listado, envío aprobado, envío pendiente y error; `/resenas` se suma a las suites de accesibilidad y responsive.

### Despliegue

`netlify.toml` declara `[functions] directory = "netlify/functions"` y el redirect de `/api/reviews`. El despliegue pasa a ser `npx netlify-cli deploy --prod` (con login y link previos) o un build conectado a repositorio. Se documentan `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT`. Arrastrar solo `dist` deja de ser suficiente para las reseñas, aunque el resto del sitio sigue funcionando.

## Risks / Trade-offs

- [Publicación automática sin revisión humana] → Filtro de URLs/términos, honeypot, límite por IP, token administrativo y borrado documentado.
- [Spam que evada el filtro] → El administrador puede eliminar; se puede añadir CAPTCHA o moderación total más adelante.
- [Condiciones de carrera en el contador de IP] → El límite es aproximado; el riesgo de abuso es bajo para el volumen esperado.
- [Blobs con latencia o fallo temporal] → La página muestra error y reintento; la API responde `500` sin datos parciales.
- [CLI añade fricción al despliegue] → Se documenta el flujo; el sitio estático sigue siendo desplegable sin Functions, pero las reseñas no estarán disponibles.
- [Cold start de Functions] → Aceptable; la página muestra estado de carga.
- [Sin panel de moderación] → La moderación por `curl` es suficiente al inicio; un panel visual puede añadirse después sin cambiar la API.

## Migration Plan

1. Instalar `@netlify/blobs` y `@netlify/functions`; agregar la Function, el redirect y las variables de entorno.
2. Publicar la página, navegación, metadatos y pruebas.
3. Verificar el build estático y las suites unitarias/E2E con la API simulada.
4. Configurar `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT` en Netlify.
5. Desplegar con Netlify CLI y verificar `GET`/`POST` en producción, además de la moderación con un token válido.

Rollback: desplegar el build estático anterior. La página mostrará el estado de API no disponible; no se pierden datos existentes en Blobs y se pueden eliminar manualmente si se abandona la función.
