# Tasks

## 1. Preparación y dependencias

- [ ] 1.1 Añadir `@netlify/blobs`, `@netlify/functions`, `marked`, `dompurify` y `sanitize-html`; añadir `@types/sanitize-html` como dependencia de desarrollo.
- [ ] 1.2 Crear `src/content/generated/blog.json` con `[]` y `tests/fixtures/blog.json` con dos artículos publicados de prueba (sin imágenes externas).
- [ ] 1.3 Configurar el alias `@blog-data` en `vite.config.ts` y en TypeScript, usando `BLOG_DATA_FILE` si existe y `src/content/generated/blog.json` por defecto.
- [ ] 1.4 Actualizar `netlify.toml` con `[functions] directory = "netlify/functions"` y `node_bundler = "esbuild"`; mantener Node 22.
- [ ] 1.5 Añadir scripts `deploy` (`npx netlify-cli deploy --build --prod`) y `dev:netlify` (`npx netlify-cli dev`).
- [ ] 1.6 Verificar que `.env` está ignorado y documentar las variables necesarias sin incluir secretos.

## 2. Librería del blog en el servidor

- [ ] 2.1 Crear tipos compartidos del servidor (`BlogPostRecord`, `PublicBlogPost`, `BlogStatus`) y utilidades de validación de título, extracto, contenido, slug y estado.
- [ ] 2.2 Implementar `slugify` con eliminación de acentos, límite de longitud, slugs reservados y generación de sufijo único.
- [ ] 2.3 Implementar la conversión Markdown → HTML saneado con `marked` + `sanitize-html`; permitir solo etiquetas, atributos y esquemas acordados; añadir `loading="lazy"` y `decoding="async"` a imágenes.
- [ ] 2.4 Implementar el servicio de artículos sobre Blobs: listar, obtener, crear, actualizar, eliminar, garantizar slug único, fijar `publishedAt` y mapear a `PublicBlogPost`.
- [ ] 2.5 Implementar autenticación: comparación de contraseña con tiempo constante, firma/verificación HMAC de sesión, expiración de 8 h, parseo y serialización de cookie.
- [ ] 2.6 Implementar verificación de `Origin` para métodos mutantes y límite de 5 intentos de login por IP cada 15 minutos con IP hasheada.
- [ ] 2.7 Implementar el disparo del build hook con timeout y el cálculo de cuándo dispararlo (publicar, editar publicado, despublicar, eliminar publicado; nunca para borradores).
- [ ] 2.8 Crear helpers HTTP para JSON, errores con campos, lectura de body y validación de variables de entorno; no registrar secretos ni contenido.
- [ ] 2.9 Escribir pruebas unitarias de slug, validación, saneado, sesión, cookies, rate limit, servicio de artículos y lógica de build.

## 3. Netlify Functions

- [ ] 3.1 Crear `admin-login`, `admin-logout` y `admin-session` con `config.path` exacto y respuestas `401`/`429`/`503` según corresponda.
- [ ] 3.2 Crear `admin-posts` para `GET`, `POST`, `PATCH` y `DELETE`, con autenticación, validación, errores por campo y respuesta `{ post, build }`.
- [ ] 3.3 Crear `admin-images` para subida `multipart/form-data`, validando MIME y tamaño máximo de 5 MB, guardando bytes y metadatos en Blobs y devolviendo `{ url, key }`.
- [ ] 3.4 Crear `admin-build` para reconstrucción manual protegida por sesión.
- [ ] 3.5 Crear `blog-posts` público que devuelva solo artículos publicados, ordenados y sin datos administrativos.
- [ ] 3.6 Crear `blog-image` público que valide que la clave empieza con `image:`, entregue el tipo correcto y aplique caché inmutable y `ETag`.
- [ ] 3.7 Probar las Functions con `netlify dev`: login, sesión, CRUD, subida, imagen pública y API pública.

## 4. Datos de build y SSG

- [ ] 4.1 Crear `scripts/generate-blog-data.mjs` que consulte `BLOG_API_URL || URL`, use timeout, valide la respuesta y escriba el JSON; si falla, conserve el archivo existente y advierta.
- [ ] 4.2 Soportar `BLOG_DATA_FILE` y `BLOG_SKIP_FETCH=1` para pruebas sin red.
- [ ] 4.3 Actualizar `prebuild` para ejecutar primero la generación de datos y después el sitemap.
- [ ] 4.4 Actualizar `scripts/generate-sitemap.mjs` para incluir `/blog/<slug>` y añadir `Disallow: /admin` a `robots.txt`.
- [ ] 4.5 Actualizar `vite.config.ts` para leer el JSON, excluir `/admin` de las rutas públicas prerenderizadas y añadir una ruta `/blog/<slug>` por artículo.
- [ ] 4.6 Revisar `scripts/check-seo.mjs` y `check-contact.mjs` para que validen también los artículos generados; ajustar si usan rutas fijas.
- [ ] 4.7 Verificar `BLOG_DATA_FILE=tests/fixtures/blog.json BLOG_SKIP_FETCH=1 npm run build` y comprobar HTML, sitemap y metadatos de los artículos.

## 5. Frontend público

- [ ] 5.1 Crear `src/content/blog.ts` que importe `@blog-data`, ordene por `publishedAt` y exponga `blogPosts` y `getPostBySlug`.
- [ ] 5.2 Ampliar `usePageMeta` para resolver imágenes relativas contra `SITE_URL` y admitir `type: 'article'`; añadir pruebas.
- [ ] 5.3 Reemplazar el placeholder de `BlogView.vue` por el listado con tarjetas, fechas, portada opcional y estado vacío.
- [ ] 5.4 Crear `BlogPostView.vue` con título, fecha, portada, HTML saneado con `DOMPurify`, enlace de vuelta y 404 para slugs inexistentes.
- [ ] 5.5 Añadir las rutas `/blog/:slug` y `/admin/blog` al router; marcar `/admin` con `noindex, nofollow` y no enlazarlo en navegación pública.
- [ ] 5.6 Añadir estilos de artículo legibles y responsive sin depender de un plugin nuevo de tipografía.
- [ ] 5.7 Escribir pruebas de componentes para listado con/sin artículos, detalle, 404, fechas y saneado en el cliente.

## 6. Panel administrativo

- [ ] 6.1 Crear `AdminBlogView.vue` con verificación de sesión, login, logout, estados de carga y errores anunciados con `aria-live`.
- [ ] 6.2 Implementar la lista de artículos con título, estado, fecha, acciones de editar/eliminar y botón “Nuevo artículo”.
- [ ] 6.3 Implementar el formulario de edición con título, slug automático/editable, extracto, portada, contenido Markdown y validación por campo.
- [ ] 6.4 Implementar la barra de herramientas (negritas, cursivas, título, lista, enlace, imagen) y la vista previa con `marked` + `DOMPurify`.
- [ ] 6.5 Implementar subida de imágenes para portada y contenido, con estados de progreso/error e inserción de Markdown en la selección.
- [ ] 6.6 Implementar guardar borrador, publicar, despublicar, eliminar con confirmación y reconstrucción manual; mostrar advertencias del build hook.
- [ ] 6.7 Revisar accesibilidad y responsive del panel: etiquetas, foco, teclado, regiones live y alternancia edición/vista previa en móvil.
- [ ] 6.8 Escribir pruebas de componentes del login, lista, editor, vista previa, subida, guardado y errores.

## 7. SEO, robots y seguridad

- [ ] 7.1 Generar por artículo título, descripción, canonical absoluto y Open Graph de título, descripción, imagen y URL con tipo `article`.
- [ ] 7.2 Verificar que `/admin` no aparece en el sitemap, tiene `noindex` y está desautorizado en `robots.txt`.
- [ ] 7.3 Revisar la CSP existente: API e imágenes son same-origin; no debe requerir orígenes externos.
- [ ] 7.4 Ejecutar `check-seo` sobre un build con fixture y corregir metadatos faltantes o duplicados.
- [ ] 7.5 Revisar seguridad: cookie, expiración, rate limit, `Origin`, saneado, límites de imagen y ausencia de secretos en logs/bundle.

## 8. Despliegue y documentación

- [ ] 8.1 Documentar en README el acceso a `/admin/blog`, variables, creación del build hook, límites de imagen y flujo de publicación con espera de 1–2 minutos.
- [ ] 8.2 Documentar despliegue con Netlify CLI o build conectado, `netlify dev`, `BLOG_API_URL` y el uso del fixture para pruebas.
- [ ] 8.3 Configurar en Netlify `BLOG_ADMIN_PASSWORD`, `BLOG_SESSION_SECRET` (32+ caracteres) y `BLOG_BUILD_HOOK_URL`; desplegar con CLI.
- [ ] 8.4 Verificar en producción login, subida, publicación, aparición del artículo tras el rebuild, sitemap y 404.
- [ ] 8.5 Documentar rollback y la recomendación de respaldar artículos/imágenes; anotar que las imágenes huérfanas no se eliminan automáticamente.

## 9. E2E y verificación final

- [ ] 9.1 Añadir pruebas Playwright del panel con APIs mockeadas: login, crear borrador, publicar, vista previa, error de login y cierre de sesión.
- [ ] 9.2 Añadir pruebas Playwright del blog público con fixture: listado, detalle, orden, enlace de vuelta y 404.
- [ ] 9.3 Añadir `/blog` y `/blog/<slug>` a las suites de accesibilidad y responsive.
- [ ] 9.4 Verificar que las páginas del blog no hacen peticiones a terceros y que las imágenes del blog son same-origin.
- [ ] 9.5 Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y Playwright; corregir fallos.

## 10. Cierre

- [ ] 10.1 Marcar las tareas completadas y validar el cambio con `openspec validate add-blog-editor --strict`.
- [ ] 10.2 Archivar el cambio solo después de desplegar y verificar el flujo completo en producción.
