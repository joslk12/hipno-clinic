# Proposal

## Why

Hoy cualquier visitante puede publicar una reseña en `/resenas`, lo que permite que personas que nunca fueron pacientes o clientes opinen y distorsionen la prueba social del sitio. El panel de administración carece de una forma de invitar a clientes reales a dejar su opinión, y el proyecto no tiene ningún repositorio de pacientes ni integración de correo o WhatsApp.

## What Changes

- Se elimina el acceso libre al formulario público de reseñas: `/resenas` seguirá mostrando el listado y el resumen, pero el formulario solo se habilitará cuando la liga incluya un token válido.
- La creación de reseñas (`POST /api/reviews`) SHALL exigir un token de invitación válido, con lo que se evita el envío directo sin invitación previa.
- Se agrega un panel `/admin/resenas` protegido con la sesión administrativa existente (`oc_admin_session`) para:
  - registrar clientes con nombre, correo y/o número de WhatsApp;
  - generar y enviar una liga `/resenas?token=<token>` por correo y/o WhatsApp;
  - consultar el estado de cada invitación (pendiente, enviada, canjeada, expirada).
- Se crea un repositorio de clientes e invitaciones en Netlify Blobs, siguiendo el patrón de stores existente.
- Se integran proveidores de envío: Resend para correo y WhatsApp Cloud API para mensajes, invocados desde Netlify Functions con credenciales en variables de entorno.
- **BREAKING**: el formulario de `/resenas` deja de estar disponible para visitantes sin token; las pruebas y la documentación que asumen acceso público deben actualizarse.
- Se documentan las nuevas variables de entorno y se amplía la CSP para permitir las llamadas salientes a los proveedores.

## Capabilities

### New Capabilities

- `review-invitations`: registro de clientes por parte del admin, emisión de ligas con token único, envío por correo o WhatsApp, control del ciclo de vida de la invitación y asociación entre la invitación y la reseña creada.

### Modified Capabilities

- `client-reviews`: `/resenas` deja de mostrar el formulario a visitantes sin invitación y `POST /api/reviews` pasa a exigir un token de invitación vigente. El spec base está en `openspec/changes/add-client-reviews/specs/client-reviews/spec.md` y debe sincronizarse antes que este change.

## Impact

- **Frontend**: `src/views/ReviewsView.vue`, `src/components/sections/ReviewForm.vue`, `src/services/reviews.ts`, nuevos componentes y vista bajo `src/views/admin/` y `src/components/admin/`, `src/router/index.ts`, `src/types/`.
- **Backend**: `netlify/lib/reviews/handler.ts` y `netlify/functions/reviews.ts`; nuevas Functions para clientes e invitaciones bajo `netlify/functions/` y lógica en `netlify/lib/review-invitations/`.
- **Datos**: nuevos stores de Netlify Blobs para clientes e invitaciones; el modelo de reseña no cambia, pero su creación queda condicionada al token.
- **Seguridad**: reutilización de la sesión HMAC del blog, tokens de invitación con expiración y un solo uso, y defensas CSRF ya existentes.
- **Integraciones y configuración**: Resend, WhatsApp Cloud API, nuevas variables de entorno y `public/_headers` (CSP `connect-src`).
- **Pruebas y documentación**: unitarias, E2E, README y specs delta de las capacidades listadas.
