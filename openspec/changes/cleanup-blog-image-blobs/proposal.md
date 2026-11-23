# Proposal

## Why

El blog ya guarda las imágenes en Netlify Blobs y `BlogStore.deleteImage()` existe, pero nadie lo invoca: al eliminar un artículo solo se borra el registro y las imágenes quedan huérfanas. `add-blog-editor/design.md` lo documentaba como deuda pendiente.

## What Changes

- Al eliminar un artículo, extraer todas las claves `image:<uuid>` referenciadas en su portada, Markdown y HTML, y borrar sus blobs después de borrar el post.
- No borrar claves que todavía aparezcan en otro artículo, aunque estuvieran en el post eliminado.
- Si falla la eliminación de algún blob, conservar el borrado del artículo, devolver un aviso en `images.warning` y mostrarlo en `/admin/blog`.
- Reportar cuántas imágenes se eliminaron en `images.deleted` y reflejarlo en el aviso de la UI.

## Capabilities

### Modified Capabilities

- `blog`: la eliminación de artículos pasa a incluir la limpieza de sus imágenes en Blobs y el panel informa del resultado.

## Impact

- **Backend**: `netlify/lib/blog/images.ts`, `netlify/lib/blog/handlers.ts` y `src/types/blog.ts` (`BlogDeleteResult.images`).
- **Frontend**: `src/views/admin/AdminBlogView.vue` y `src/components/admin/AdminPostEditor.vue` para mostrar el resultado de la limpieza.
- **Datos**: sin migración; las imágenes siguen en Netlify Blobs bajo `image:<uuid>`.
- **Fuera de alcance**: quitar o reemplazar una imagen al editar un artículo no elimina el blob anterior; los rate limits tampoco se limpian.
- **Riesgo**: Blobs y Postgres/Blob de artículos no comparten transacción. La limpieza es best-effort y se notifican los fallos para no perder el borrado del artículo.
