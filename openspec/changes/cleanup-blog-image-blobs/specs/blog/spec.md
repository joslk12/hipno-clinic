# Spec Delta

## Purpose

La eliminación de artículos del blog libera también las imágenes que subió el administrador, sin afectar a imágenes que siguen en uso.

## ADDED Requirements

### Requirement: Limpieza de imágenes al eliminar artículos

`DELETE /api/admin/blog/posts?id=<id>` SHALL eliminar los blobs de todas las imágenes referenciadas por el artículo en su portada, su Markdown o su HTML. Las claves que sigan referenciadas por otro artículo MUST NOT eliminarse. La respuesta SHALL incluir `images.deleted` con el número de blobs eliminados y, si alguna eliminación falla, `images.warning` con un mensaje explicativo. Un fallo de Blobs MUST NOT revertir ni ocultar la eliminación del artículo.

#### Scenario: Artículo con portada e imagen en el cuerpo

- **WHEN** se elimina un artículo cuya portada y contenido referencian dos imágenes distintas
- **THEN** se eliminan ambos blobs y la respuesta indica `images.deleted = 2`

#### Scenario: Imagen compartida

- **WHEN** la portada del artículo eliminado usa la misma clave que otro artículo
- **THEN** ese blob se conserva y solo se eliminan las imágenes exclusivas del artículo eliminado

#### Scenario: Fallo parcial de Blobs

- **WHEN** no se puede eliminar una de las imágenes del artículo
- **THEN** el artículo permanece eliminado, las demás imágenes se borran y la respuesta incluye `images.warning`

#### Scenario: Aviso en el panel

- **WHEN** el administrador elimina un artículo desde la lista o desde el editor
- **THEN** el aviso del panel indica cuántas imágenes se eliminaron o muestra la advertencia de limpieza incompleta
