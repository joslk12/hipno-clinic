# Design

## Context

Los stores `blog` y `clients` de Netlify Blobs guardan hoy artículos y clientas como JSON bajo las llaves `post:<uuid>` y `client:<uuid>`. Las imágenes del blog usan `image:<uuid>` en el mismo store y deben permanecer ahí porque Blobs sirve bytes con metadatos y ETag. La instancia de Netlify DB provee una connection string Postgres, pero el proyecto no tiene ninguna referencia a `DATABASE_URL`.

## Goals / Non-Goals

**Goals:**

- Guardar artículos y clientas en Postgres con restricciones de integridad.
- Migrar una sola vez los datos existentes sin perder imágenes ni referencias.
- Mantener el comportamiento actual de las APIs de blog y administración de clientas.
- Permitir desplegar antes de configurar la variable de entorno.

**Non-Goals:**

- Migrar reseñas, invitaciones ni rate limits.
- Cambiar el formato de las imágenes ni sus URLs públicas.
- Cambiar el flujo de generación de `blog.json` durante el build.
- Crear un panel para ejecutar migraciones manuales.

## Decisions

### 1. Driver y configuración

Se usa `@netlify/neon`, wrapper de `@neondatabase/serverless`, con `DATABASE_URL` o `NETLIFY_DATABASE_URL`. El driver habla HTTPS, por lo que funciona en Netlify Functions sin sockets TCP. La conexión se inicializa de forma diferida y se memoiza por instancia; si falla, se descarta la promesa para poder reintentar.

**Alternativa descartada**: `pg` con conexiones TCP persistentes, que no conviene en serverless.

### 2. Esquema idempotente

`netlify/lib/db/schema.ts` contiene sentencias `CREATE TABLE IF NOT EXISTS` ejecutadas una por una (el driver no acepta varias sentencias en una sola consulta). Las tablas son `blog_posts`, `review_clients`, `availability_rules`, `schedule_slots`, `appointments` y `migration_state`. Los campos de fecha se guardan como `timestamptz` y se convierten a ISO al leer.

### 3. Migración única desde Blobs

Antes de devolver la conexión, `initializeDatabase()` verifica `migration_state` y, si no existe la marca, lee `post:` y `client:` de Blobs, inserta con `ON CONFLICT (id) DO NOTHING` y registra la marca. Si Blobs no está disponible (por ejemplo, en desarrollo local sin Netlify CLI), se omite sin marcar para poder reintentar. Los datos ya migrados no se sobrescriben.

### 4. Blobs solo para imágenes en lo migrado

El store compuesto del blog toma artículos de Postgres y deja en Blobs `getImage`, `saveImage`, `deleteImage` y los rate limits de login. El store de clientas usa Postgres; las invitaciones siguen en su store propio de Blobs.

### 5. Fallback sin base de datos

`hasDatabase()` decide qué store se usa. Sin `DATABASE_URL`, se mantienen los stores de Blobs actuales. Así un deploy anterior a la configuración sigue funcionando y la migración ocurre automáticamente cuando se agrega la variable.

## Risks / Trade-offs

- [Riesgo] Credencial filtrada en la conversación → Mitigación: rotarla en Netlify antes de configurar `DATABASE_URL`; no se guarda en el repo.
- [Riesgo] Escritura de esquema en cada arranque en frío → Mitigación: sentencias idempotentes y promesa memoizada; coste limitado a la primera petición.
- [Riesgo] Migración duplicada → Mitigación: `ON CONFLICT DO NOTHING` y marca en `migration_state`.
- [Riesgo] Blobs no disponible durante la migración → Mitigación: se omite y se reintenta en el siguiente arranque.

## Migration Plan

1. Rotar la credencial de Netlify DB.
2. Configurar `DATABASE_URL` como variable secreta en Netlify.
3. Desplegar: el esquema se crea y los datos se copian en el primer arranque en frío.
4. Verificar `/api/blog/posts` y `/api/admin/blog/posts`, y el listado de clientas en `/admin/resenas`.
5. Rollback: quitar `DATABASE_URL`; el sitio vuelve a los stores de Blobs sin borrar los datos de Postgres.

## Open Questions

Ninguna. El usuario confirmó Netlify DB/Neon como destino, migración de posts, clientas y citas, y conservación de reseñas e invitaciones en Blobs.
