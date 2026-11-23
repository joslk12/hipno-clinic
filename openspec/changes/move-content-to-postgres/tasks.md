# Tasks

## 1. Conexión y esquema

- [x] 1.1 Agregar `@netlify/neon` como dependencia.
- [x] 1.2 Crear `netlify/lib/db/client.ts` con `getSql()`, `hasDatabase()` y helpers de conversión; verificar con `npm run typecheck`.
- [x] 1.3 Crear `netlify/lib/db/schema.ts` con las sentencias idempotentes de las seis tablas y el índice parcial de citas.
- [x] 1.4 Crear `netlify/lib/db/migrate.ts` con la copia única desde los stores `blog` y `clients`.

## 2. Repositorios

- [x] 2.1 Crear `netlify/lib/blog/post-store.ts` con `createPostgresPostStore` y mapeo de filas; verificar con `npm run typecheck`.
- [x] 2.2 Crear `netlify/lib/review-invitations/client-store.ts` con `createPostgresClientStore` y mapeo de filas.
- [x] 2.3 Conectar `netlify/lib/blog/runtime.ts` y `netlify/lib/review-invitations/runtime.ts` con fallback a Blobs.
- [x] 2.4 Agregar tests unitarios de mapeo de filas y de los repositorios con un `Sql` falso.

## 3. Configuración y documentación

- [x] 3.1 Documentar `DATABASE_URL` en `.env.example` sin credenciales reales.
- [x] 3.2 Verificar que `SECRETS_SCAN_OMIT_KEYS` no excluya `DATABASE_URL`.
- [x] 3.3 Actualizar `README.md` con la configuración de Netlify DB, el orden de despliegue y la rotación de credenciales.

## 4. Verificación

- [x] 4.1 Ejecutar `npm run typecheck`, `npm test`, `npm run lint` y `npm run build`.
- [ ] 4.2 Validar en producción que `/api/blog/posts` devuelve el artículo migrado y que `/admin/resenas` lista las clientas.
- [x] 4.3 Ejecutar `openspec validate move-content-to-postgres --strict`.
