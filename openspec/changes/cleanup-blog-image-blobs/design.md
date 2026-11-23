# Design

## Context

Los artículos están en Postgres cuando hay base de datos y en Blobs (`post:<id>`) si no; las imágenes siempre están en Blobs (`image:<uuid>`) y se sirven por `/api/blog/images?key=...`. `createAdminPostsHandler` ya valida sesión y origen y, en `DELETE`, comprueba que el artículo exista, lo elimina y dispara el rebuild si estaba publicado. `BlogStore.deleteImage()` existe tanto en el store de Blobs como en el compuesto de `runtime.ts`, pero no tenía consumidores.

## Decisions

### 1. Descubrimiento de imágenes

`imageKeysFromText()` extrae todas las claves que siguen el patrón `/api/blog/images?key=image:<uuid>` de cualquier texto. `postImageKeys()` lo aplica a `coverImage`, `contentMarkdown` y `contentHtml` del artículo y deduplica. El patrón también funciona con URLs absolutas porque incluye el path, y valida la clave con `isValidImageKey()` antes de usarla.

### 2. Borrado seguro

Antes de borrar el artículo se consultan los demás posts y se descartan las claves que alguno sigue referenciando. Así se evita romper imágenes copiadas de un artículo a otro. Después se elimina el post y se llama a `deleteImage()` solo para las claves propias. Si `listPosts()` falla, la petición falla antes de borrar el artículo, evitando un estado parcial.

### 3. Fallos parciales de Blobs

No hay transacción entre el almacén de artículos y Blobs. Cada `deleteImage()` se ejecuta de forma independiente y se capturan errores: el artículo ya borrado no se restaura. La respuesta `BlogDeleteResult` incorpora `images: { deleted: number; warning?: string }`. El panel muestra `Artículo eliminado. Se eliminaron N imágenes.` o añade el aviso de fallo al mensaje de rebuild existente. `AdminPostEditor` reenvía el resultado al padre para que el mensaje aparezca también al borrar desde el editor.

### 4. Compatibilidad

`images` es un campo nuevo. El frontend usa `result.images?.` para tolerar respuestas antiguas o mocks sin ese campo. El tipo `BlogDeleteResult` lo declara obligatorio para las respuestas nuevas del handler.

## Alternatives considered

- Borrar los blobs antes que el artículo: más simple, pero un fallo de Blobs dejaría el artículo publicado con imágenes rotas.
- Fallar toda la petición si Blobs falla: revertir no es posible y el usuario perdería la confirmación de que el artículo ya se eliminó.
- Escanear todos los blobs con prefijo `image:` y borrar huérfanos: más costoso y podría borrar imágenes en uso; se prefiere partir de las referencias del artículo.

## Risks

- Las URLs de imagen se sirven con `Cache-Control: immutable`; una imagen borrada podría seguir visible en cachés hasta que expire. No afecta al artículo, que ya no existe.
- Quitar o reemplazar una imagen al editar un artículo sigue generando blobs huérfanos; se deja para una limpieza futura.
- Un texto arbitrario que contenga la URL de una imagen del blog provocaría su borrado al eliminar el artículo; es el mismo riesgo que ya implica poder copiar esa URL.
