# Tasks

## 1. Preparación

- [x] 1.1 Instalar `@netlify/blobs` y `@netlify/functions`, agregar `tsconfig.functions.json` y su referencia en `tsconfig.json`; verificar que `npm install` y `npm run typecheck` terminan sin errores.
- [x] 1.2 Configurar `netlify.toml` con `[functions] directory = "netlify/functions"` y el redirect de `/api/reviews`; validar el TOML con `python3 -c "import tomllib; tomllib.load(open('netlify.toml','rb'))"`.
- [x] 1.3 Agregar `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT` a `.env.example` y un script `deploy` en `package.json`; verificar que las claves aparecen en `.env.example` y que `npm run` lista `deploy`.

## 2. Backend

- [x] 2.1 Crear los tipos compartidos en `src/types/reviews.ts` y los límites en `src/content/reviews.ts`; verificar con `npm run typecheck`.
- [x] 2.2 Implementar validación, detección de spam y hash de IP en `netlify/lib/reviews/validation.ts`; verificar con `npx vitest run netlify/lib/reviews/__tests__/validation.spec.ts`.
- [x] 2.3 Implementar la interfaz `ReviewStore` y el adaptador de Netlify Blobs en `netlify/lib/reviews/store.ts`, con un almacén en memoria para pruebas; verificar con `npx vitest run netlify/lib/reviews/__tests__/store.spec.ts`.
- [x] 2.4 Implementar `GET` y `POST` en `netlify/lib/reviews/handler.ts` con publicación automática, retención de spam, honeypot y límite por IP; verificar respuestas `201`, `400`, `429` y `500` con `npx vitest run netlify/lib/reviews/__tests__/handler.spec.ts`.
- [x] 2.5 Implementar la consulta de pendientes y `PATCH`/`DELETE` administrativos con token y comparación de tiempo constante; verificar `200`, `204`, `401`, `403` y `503` con `npx vitest run netlify/lib/reviews/__tests__/admin.spec.ts`.
- [x] 2.6 Crear `netlify/functions/reviews.ts` con el handler conectado a Blobs y a las variables de entorno; verificar con `npm run typecheck` y `npx vitest run netlify/lib/reviews`.

## 3. Frontend

- [x] 3.1 Implementar `src/services/reviews.ts` con `listReviews` y `createReview`, errores tipados y campos de error del servidor; verificar con `npx vitest run src/services/__tests__/reviews.spec.ts`.
- [x] 3.2 Crear `src/components/ui/StarRating.vue` con estrellas decorativas y el valor en texto; verificar con `npx vitest run src/components/ui/__tests__/star-rating.spec.ts`.
- [x] 3.3 Crear `src/components/sections/ReviewForm.vue` con nombre, radios de 1 a 5, mensaje, consentimiento, honeypot, validación, foco al primer error y estados de envío; verificar con `npx vitest run src/components/sections/__tests__/review-form.spec.ts`.
- [x] 3.4 Crear `src/components/sections/ReviewList.vue` con estados de carga, vacío, error con reintento y fechas en español; verificar con `npx vitest run src/components/sections/__tests__/review-list.spec.ts`.
- [x] 3.5 Crear `src/views/ReviewsView.vue` con carga al montar, resumen, formulario y recarga tras un envío; verificar con `npx vitest run src/views/__tests__/reviews-view.spec.ts`.
- [x] 3.6 Agregar la ruta `/resenas`, el enlace "Reseñas" en `navLinks` y `pageMeta.reviews`; verificar con `npm run typecheck` y `npx vitest run src/router src/content/__tests__/pages.spec.ts`.
- [x] 3.7 Ajustar la navegación para que el nuevo enlace no desborde a 768px; verificar con `npx playwright test tests/e2e/responsive.spec.ts`.

## 4. SEO, build y documentación

- [x] 4.1 Agregar `/resenas` a `scripts/generate-sitemap.mjs` y `scripts/check-seo.mjs`; verificar con `npm run build` que exista `dist/resenas.html` y que el sitemap incluya la ruta.
- [x] 4.2 Actualizar `README.md` con la página de reseñas, la API, las variables de entorno, la moderación con `curl`, el despliegue con Netlify CLI y la limitación de arrastrar solo `dist`; verificar que los comandos documentados existan en `package.json` o sean ejecutables.
- [x] 4.3 Confirmar que `public/_headers` mantiene `connect-src 'self'` y que la página no añade requests de terceros; verificar con `npx playwright test tests/e2e/network.spec.ts`.

## 5. E2E

- [x] 5.1 Agregar `/resenas` a `tests/e2e/a11y.spec.ts` y `tests/e2e/responsive.spec.ts`; verificar con `npx playwright test tests/e2e/a11y.spec.ts tests/e2e/responsive.spec.ts`.
- [x] 5.2 Crear `tests/e2e/reviews.spec.ts` con mocks de `GET`/`POST` para listado, envío aprobado, envío pendiente y error con reintento; verificar con `npx playwright test tests/e2e/reviews.spec.ts`.
- [x] 5.3 Ejecutar `npx playwright test` completo y confirmar que no hay regresiones.

## 6. Integración

- [x] 6.1 Ejecutar `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx playwright test`; corregir cualquier fallo.
- [x] 6.2 Ejecutar `openspec validate add-client-reviews --strict` y confirmar que el cambio es válido.

## Workflow follow-up

- Configurar `REVIEWS_ADMIN_TOKEN` y `REVIEWS_RATE_SALT` en Netlify.
- Ejecutar `npx netlify-cli login` y `npx netlify-cli link` una vez.
- Desplegar con `npm run deploy` o `npx netlify-cli deploy --prod`.
- Verificar en producción `GET`/`POST /api/reviews` y aprobar/eliminar con el token.
- Considerar un panel de administración visual en un cambio posterior.
