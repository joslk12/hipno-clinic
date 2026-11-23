# Spec Delta

## Purpose

El blog mantiene su comportamiento público y administrativo, pero sus artículos se almacenan en Postgres mientras las imágenes permanecen en Netlify Blobs.

## ADDED Requirements

### Requirement: Almacenamiento de artículos en Postgres

El repositorio de artículos SHALL leer y escribir en la tabla `blog_posts` cuando haya una base de datos configurada. Los campos `createdAt`, `updatedAt` y `publishedAt` SHALL conservarse como fechas ISO al mapear las filas. El comportamiento de las APIs `/api/blog/posts` y `/api/admin/blog/posts` MUST NOT cambiar.

#### Scenario: Publicar un artículo

- **WHEN** el administrador guarda un artículo publicado
- **THEN** se inserta o actualiza en `blog_posts` y el build se dispara igual que antes

#### Scenario: Blog público

- **WHEN** se consulta `/api/blog/posts`
- **THEN** se devuelven los artículos publicados desde Postgres, ordenados por fecha de publicación

### Requirement: Imágenes en Netlify Blobs

Las imágenes del blog SHALL seguir guardadas en Netlify Blobs bajo la llave `image:<uuid>` y SHALL servirse mediante `/api/blog/images?key=...` con sus metadatos y ETag. La migración a Postgres MUST NOT copiar ni alterar esas imágenes.

#### Scenario: Subir imagen

- **WHEN** el administrador sube una imagen desde `/admin/blog`
- **THEN** el binario se guarda en Blobs y el artículo referencia su key

#### Scenario: Ver imagen migrada

- **WHEN** se abre un artículo migrado que referencia una imagen existente
- **THEN** la imagen se sirve desde Blobs sin cambios en la URL
