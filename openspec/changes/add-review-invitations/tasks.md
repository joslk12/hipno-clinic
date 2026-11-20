# Tasks

## 1. Preparación y contratos

- [x] 1.1 Definir los tipos compartidos de cliente e invitación en `src/types/review-invitations.ts` y ampliar `CreateReviewPayload` en `src/types/reviews.ts` con `invitationToken`; verificar con `npm run typecheck`.
- [x] 1.2 Agregar `RESEND_API_KEY`, `REVIEWS_FROM_EMAIL`, `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` a `.env.example` con valores de ejemplo; verificar que las cuatro claves aparecen en el archivo.
- [x] 1.3 Ampliar `connect-src` en `public/_headers` con `https://api.resend.com` y `https://graph.facebook.com` sin relajar otras directivas; verificar que `npm run build` copia el archivo a `dist/_headers` y ejecutar `npx playwright test tests/e2e/network.spec.ts`.

## 2. Stores de clientes e invitaciones

- [x] 2.1 Crear `netlify/lib/review-invitations/store.ts` con `ClientStore`, `InvitationStore`, adaptadores Blobs (`clients`, `review-invitations`) y stores en memoria, con claves `client:<uuid>` e `invitation:<hash>`; verificar con `npm run typecheck`.
- [x] 2.2 Implementar la generación de tokens opacos, su hash SHA-256, la expiración de 30 días y el estado de la invitación; verificar con `npx vitest run netlify/lib/review-invitations/__tests__/token.spec.ts`.
- [x] 2.3 Escribir `netlify/lib/review-invitations/__tests__/store.spec.ts` para alta, edición, eliminación, listado y canjeo; verificar que pase con `npx vitest run netlify/lib/review-invitations`.

## 3. Validación y envío de mensajes

- [x] 3.1 Crear `netlify/lib/review-invitations/validation.ts` con validación de nombre, correo y número de WhatsApp (solo dígitos con código de país); verificar con `npx vitest run netlify/lib/review-invitations/__tests__/validation.spec.ts`.
- [x] 3.2 Crear `netlify/lib/review-invitations/messaging.ts` con la interfaz `InvitationSender`, adaptadores Resend y WhatsApp Cloud API, timeout y resultado por proveedor; verificar con `npx vitest run netlify/lib/review-invitations/__tests__/messaging.spec.ts` usando mocks de `fetch`.
- [x] 3.3 Documentar en `README.md` las variables nuevas, la plantilla de WhatsApp que debe aprobarse y el hecho de que el envío es manual; verificar que los comandos y nombres de variables documentados coinciden con `.env.example`.

## 4. Endpoints administrativos del panel

- [x] 4.1 Crear `netlify/functions/admin-review-clients.ts` con `GET/POST/PATCH/DELETE /api/admin/review-clients`, reutilizando `hasValidSession`, `isAllowedOrigin` y `BLOG_SESSION_SECRET`; verificar respuestas `200`, `401` y errores de validación con `npx vitest run netlify/lib/review-invitations/__tests__/clients-handler.spec.ts`.
- [x] 4.2 Crear `netlify/functions/admin-review-invitations.ts` con `GET /api/admin/review-invitations` y `POST` para enviar o reenviar la liga por correo, WhatsApp o ambos; verificar estados `pendiente/enviada/canjeada/expirada` y fallos de proveedor con `npx vitest run netlify/lib/review-invitations/__tests__/invitations-handler.spec.ts`.
- [x] 4.3 Crear `netlify/functions/review-invitation.ts` con `GET /api/reviews/invitation?token=...` que solo indique vigencia y nunca devuelva datos del cliente; verificar con `npx vitest run netlify/lib/review-invitations/__tests__/public-invitation.spec.ts`.

## 5. Restricción de la creación de reseñas

- [x] 5.1 Ampliar `netlify/lib/reviews/handler.ts` para exigir `invitationToken` en `POST /api/reviews`, validarlo contra el store, rechazar tokens inválidos o ya canjeados con `401`/`403` y canjearlo de forma atómica antes de guardar la reseña; verificar con `npx vitest run netlify/lib/reviews/__tests__/handler.spec.ts`.
- [x] 5.2 Conectar el nuevo store y el generador de tokens en `netlify/functions/reviews.ts`, manteniendo `GET`, `PATCH` y `DELETE` sin cambios; verificar con `npx vitest run netlify/lib/reviews` y `npm run typecheck`.
- [x] 5.3 Actualizar `tests/e2e/reviews.spec.ts` para que los envíos exitosos incluyan un token simulado y agregar casos de token ausente, inválido y reutilizado; verificar con `npx playwright test tests/e2e/reviews.spec.ts`.

## 6. Frontend público

- [x] 6.1 Ampliar `src/services/reviews.ts` con `checkInvitation(token)` y el campo `invitationToken` en `createReview`,incluyendo errores tipados; verificar con `npx vitest run src/services/__tests__/reviews.spec.ts`.
- [x] 6.2 Modificar `ReviewsView.vue` para leer `?token=` al montar, validar la invitación y mostrar el formulario solo si es vigente; verificar estados vigente, inválido y error con `npx vitest run src/views/__tests__/reviews-view.spec.ts`.
- [x] 6.3 Modificar `ReviewForm.vue` para aceptar y enviar el token sin exponerlo en la interfaz; verificar con `npx vitest run src/components/sections/__tests__/review-form.spec.ts`.
- [x] 6.4 Actualizar los textos de `/resenas` para explicar que las reseñas se escriben solo con una invitación; verificar con `npx playwright test tests/e2e/reviews.spec.ts tests/e2e/a11y.spec.ts`.

## 7. Panel `/admin/resenas`

- [x] 7.1 Crear `src/services/adminReviewInvitations.ts` con llamadas a los endpoints de clientes e invitaciones usando `credentials: 'same-origin'` y errores tipados; verificar con `npx vitest run src/services/__tests__/admin-review-invitations.spec.ts`.
- [x] 7.2 Crear `src/views/admin/AdminReviewsView.vue` con verificación de sesión, login, logout y estados de carga/error como `AdminBlogView.vue`; verificar con `npx vitest run src/views/admin/__tests__/admin-reviews-view.spec.ts`.
- [x] 7.3 Crear `src/components/admin/AdminReviewClientList.vue` y `AdminReviewClientForm.vue` con alta, edición, eliminación y errores por campo; verificar con `npx vitest run src/components/admin/__tests__/admin-review-clients.spec.ts`.
- [x] 7.4 Agregar acciones `ENVIAR LIGA` y `REENVIAR` con selección de canales y feedback por proveedor; verificar con `npx vitest run src/components/admin/__tests__/admin-review-invitations.spec.ts`.
- [x] 7.5 Registrar la ruta `/admin/resenas`, excluirla del prerenderizado en `vite.config.ts` y desautorizarla en robots; verificar con `npm run build` (sin `dist/admin/resenas.html`) y `npx vitest run src/router`.

## 8. Integración y verificación final

- [x] 8.1 Crear `tests/e2e/admin-reviews.spec.ts` con mocks de sesión y APIs para login, alta de cliente, envío por ambos canales, reenvío y error de proveedor; verificar con `npx playwright test tests/e2e/admin-reviews.spec.ts`.
- [x] 8.2 Actualizar `README.md` con el flujo completo del panel, la API nueva y el orden de sincronización de specs descrito en `design.md`; verificar leyendo que no quedan referencias al formulario público abierto.
- [x] 8.3 Ejecutar `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx playwright test`; corregir cualquier fallo.
- [x] 8.4 Ejecutar `openspec validate add-review-invitations --strict` y confirmar que el cambio es válido.

## Workflow follow-up

- Sincronizar la spec `client-reviews` del change `add-client-reviews` antes de archivar este change.
- Configurar las credenciales de Resend y WhatsApp Cloud API en Netlify y aprobar la plantilla de WhatsApp.
- Desplegar con `npm run deploy` y probar en producción el ciclo completo: alta → envío → liga → reseña → token canjeado.
- Verificar que visitantes sin token no puedan publicar y que `/api/reviews` siga exponiendo solo reseñas aprobadas.
