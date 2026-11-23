# Proposal

## Why

Los artículos del blog y las clientas registradas para invitaciones viven hoy en Netlify Blobs como objetos JSON. Eso dificulta consultarlos, imponer restricciones de integridad y crear citas con reserva atómica. El sitio ya tiene una instancia de Netlify DB (Postgres/Neon) disponible, pero está vacía porque el código nunca la usa.

## What Changes

- Se agrega una capa de acceso a Postgres con `@netlify/neon` y la variable secreta `DATABASE_URL` (o `NETLIFY_DATABASE_URL`).
- Los artículos del blog y las clientas se guardan en las tablas `blog_posts` y `review_clients`; las imágenes siguen en Netlify Blobs y se referencian por su key.
- Las reseñas, las invitaciones y los límites de intentos permanecen en Netlify Blobs: este change no los migra.
- Se ejecuta un esquema idempotente y una migración única de los datos existentes de Blobs a Postgres al inicializar la base de datos.
- Si no hay `DATABASE_URL` configurada, el sitio sigue funcionando con los stores de Blobs actuales para no romper deploys mientras la variable se configura.

## Capabilities

### New Capabilities

- `postgres-storage`: esquema, conexión y migración única desde Netlify Blobs para artículos y clientas, con Blobs reservado a imágenes y datos operativos.

### Modified Capabilities

- `blog`: la fuente de datos de artículos pasa a Postgres; las imágenes continúan en Blobs y el build sigue generando `blog.json` desde `/api/blog/posts`.
- `review-invitations`: el repositorio de clientas pasa a Postgres; las invitaciones y su historial permanecen en Blobs.

## Impact

- **Backend**: nueva carpeta `netlify/lib/db/`, nuevos repositorios `post-store.ts` y `client-store.ts`, y cambios en `netlify/lib/blog/runtime.ts` y `netlify/lib/review-invitations/runtime.ts`.
- **Dependencias**: `@netlify/neon`.
- **Configuración**: `DATABASE_URL` como variable secreta en Netlify; `.env.example` documenta el formato sin credenciales reales.
- **Datos**: migración automática y única de `post:` y `client:` desde Blobs; no se copian imágenes ni invitaciones.
- **Riesgo**: la credencial de Netlify DB compartida en la conversación debe rotarse antes de configurar la variable.
