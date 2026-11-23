# Tasks

## 1. Backend

- [x] 1.1 Extraer `imageKeysFromText()` y `postImageKeys()` en `netlify/lib/blog/images.ts`, cubriendo portada, Markdown, HTML, URLs absolutas y deduplicación.
- [x] 1.2 En el `DELETE` de `createAdminPostsHandler`, calcular las claves propias del artículo, excluir las usadas por otros posts y llamar a `deleteImage()` después de `deletePost()`.
- [x] 1.3 Capturar errores de Blobs, devolver `images.deleted`/`images.warning` y ampliar `BlogDeleteResult` en `src/types/blog.ts`.

## 2. Panel

- [x] 2.1 Mostrar el resultado de la limpieza en el aviso de `AdminBlogView.vue` tanto al borrar desde la lista como desde el editor.
- [x] 2.2 Reenviar `BlogDeleteResult` desde `AdminPostEditor.vue` en el evento `deleted`.

## 3. Pruebas

- [x] 3.1 Unitarios de extracción de claves en `images.spec.ts`.
- [x] 3.2 Unitarios del handler: borrado exclusivo, imagen compartida y fallo parcial con aviso.
- [x] 3.3 E2E de `/admin/blog` con portada e imagen en el cuerpo, verificando el aviso de dos imágenes eliminadas.

## 4. Verificación

- [x] 4.1 `npm run typecheck`, `npm run lint` (0 errores, 2 warnings `v-html` previos), `npm test` (327 pruebas) y `npm run build`.
- [x] 4.2 `CI=1 npx playwright test` (95 pruebas E2E).
- [x] 4.3 `npx openspec validate cleanup-blog-image-blobs --strict` (válido).
- [ ] 4.4 Commitear, pushear, redesplegar y validar en producción; restaurar `public/sitemap.xml` si el build lo modifica.
