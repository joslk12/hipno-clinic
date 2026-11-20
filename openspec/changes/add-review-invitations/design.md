# Design

## Context

Ver `proposal.md` para la motivación.Estado actual relevante:

- `/resenas` es prerenderizado y muestra un formulario abierto: `ReviewsView.vue` monta `ReviewForm.vue` sin condición y `POST /api/reviews` no exige credenciales.
- La Function `reviews` ya valida contenido, aplica honeypot, limita por IP, detecta spam y modera con `REVIEWS_ADMIN_TOKEN`. Ese token es de API, no de sesión de navegador.
- El único panel visual es `/admin/blog`, protegido con cookie HMAC `oc_admin_session` de 8 horas (`netlify/lib/blog/auth.ts`), con login, logout y verificación de sesión ya implementados.
- No existe repositorio de clientes: el formulario de contacto usa Netlify Forms y sus envíos solo se consultan en el dashboard de Netlify.
- No hay integración de correo ni WhatsApp: solo enlaces estáticos `mailto:` y `wa.me` en `src/content/contact.ts`. La CSP actual restringe `connect-src` a `'self'` (`public/_headers`).
- El cambio `add-client-reviews` ya implementó la primera parte: define el comportamiento actual en `openspec/changes/add-client-reviews/specs/client-reviews/spec.md`, aunque aún no está sincronizado a `openspec/specs/`. Este change conserva ese comportamiento y agrega la capa de invitaciones encima; el acceso y el envío de reseñas se expresan como un delta `MODIFIED` de esa misma capability.

## Goals / Non-Goals

**Goals:**

- Que solo puedan publicar reseñas las personas invitadas desde el panel.
- Reutilizar la sesión administrativa existente en lugar de crear otro sistema de login.
- Mantener el sitio público prerenderizado y con `GET /api/reviews` abierto solo a reseñas aprobadas.
- Proveer una experiencia de panel coherente con `/admin/blog` (mismos componentes base, estados, errores y accesibilidad).
- Hacer el envío auditable y reintentable, sin bloquear al admin si un proveedor falla.

**Non-Goals:**

- Importar pacientes desde Netlify Forms ni construir una CRM.
- Enviar correos o mensajes automáticos al crear una reseña o al aprobarla.
- Modificar el esquema público de `PublicReview`, las reglas de spam ni el límite por IP.
- Agregar inicio de sesión para clientes: la posesión de la liga con token es la credencial.
- Sustituir el panel de blog ni unificar los tokens administrativos de reseñas y blog.

## Decisions

### 1. Gating en el servidor, con el formulario como consecuencia

El formulario se oculta en frontend, pero la garantía real estará en `POST /api/reviews`: todo envío SHALL incluir un token de invitación válido. El handler existente se ampliará para validar `invitationToken` en el payload antes de aplicar honeypot, rate limit y spam.

- **Alternativa descartada**: ocultar solo el formulario. Cualquiera podría llamar a la API directamente.
- **Alternativa descartada**: pedir login al cliente. Aumenta fricción y requiere identidad que hoy no existe.

### 2. Token opaco con almacenamiento separado

Se genera un token aleatorio criptográfico (`randomBytes(32).toString('base64url')`). En Blobs se guarda solo su hash SHA-256 como clave (`invitation:<hash>`), junto con `clientId`, `createdAt`, `expiresAt`, `status` e `history` de envíos. El token en claro viaja solo en la liga y en el mensaje. Como el token original no se conserva, el reenvío crea una nueva invitación con un token nuevo y deja la anterior inactiva.

- **Alternativa descartada**: JWT firmado. No aporta ventajas frente a un store ya existente y complica la revocación inmediata tras el canjeo.
- **Alternativa descartada**: guardar el token en claro. Innecesario y aumenta el impacto de una filtración del store.

### 3. Un solo uso con canjeo atómico

El canjeo se realiza antes de guardar la reseña: se lee la invitación, se verifica vigencia y se cambia su estado a `canjeada`. Si la reseña falla después, se revierte el estado. El plazo de expiración propuesto es de **30 días** desde la generación.

- **Alternativa descartada**: token reutilizable con límite de reseñas por IP. No evita que varias personas usen la misma liga.

### 4. Reutilizar la sesión del blog para el panel

Las nuevas Functions de cliente e invitación usarán `hasValidSession` y `isAllowedOrigin` de `netlify/lib/blog/auth.ts` con `BLOG_SESSION_SECRET`. No se crea un segundo login: `/admin/resenas` llama a `/api/admin/session` igual que `/admin/blog`.

- **Alternativa descartada**: reutilizar `REVIEWS_ADMIN_TOKEN` en el navegador. Implicaría exponer un token Bearer estático en el frontend.
- **Consecuencia**: el mismo login da acceso a blog y reseñas. Se documenta como comportamiento esperado.

### 5. Nuevos stores con el patrón existente

Bajo `netlify/lib/review-invitations/` se crean `store.ts` con `interface ClientStore` / `interface InvitationStore`, adaptadores Blobs (`clients`, `review-invitations`) y stores en memoria para tests, manteniendo `consistency: 'strong'` y claves con prefijo `:` como en `reviews`.

### 6. Functions dedicadas

Se agregan Functions con `config.path` propio, siguiendo el patrón de `admin-posts.ts`:

- `GET/POST/PATCH/DELETE /api/admin/review-clients` — CRUD de clientes.
- `GET /api/admin/review-invitations` — listado de invitaciones.
- `POST /api/admin/review-invitations` — enviar/reenviar liga (cuerpo: `clientId`, `channels`).
- `GET /api/reviews/invitation?token=...` — validación ligera del token para que `/resenas` decida si muestra el formulario. MUST NOT devolver datos del cliente.

`POST /api/reviews` pasa a aceptar `invitationToken` y lo valida contra el store. La validación de la liga en frontend es solo UX; la autoridad es el servidor.

### 7. Envío vía proveedores con adaptadores

`netlify/lib/review-invitations/messaging.ts` define una interfaz `InvitationSender` con dos implementaciones: Resend (REST `POST /emails`) y WhatsApp Cloud API (REST `POST /<phone-number-id>/messages`). Se invocan con `fetch` desde Functions y `AbortSignal.timeout`. Cada adaptador devuelve `{ ok, providerMessageId?, error? }`.

Variables nuevas: `RESEND_API_KEY`, `REVIEWS_FROM_EMAIL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. La plantilla de correo y WhatsApp incluye solo la liga y texto neutro; el nombre del cliente se usa como variable, sin exponer otros datos.

### 8. CSP y rutas

`public/_headers` debe ampliar `connect-src` con `https://api.resend.com` y `https://graph.facebook.com` (dominio de WhatsApp Cloud API). No se abre `form-action` ni se habilita `unsafe-inline` adicional. `/admin/resenas` se excluye del prerenderizado en `vite.config.ts` igual que `/admin/blog`, y se añade a robots/sitemap como desautorizada.

### 9. Interfaz de panel

Nueva vista `src/views/admin/AdminReviewsView.vue` con el mismo patrón que `AdminBlogView.vue`: verificación de sesión al montar, `AdminLogin.vue` si no hay sesión, lista de clientes con estado de invitación, formulario de alta/edición y botones `ENVIAR LIGA`, `REENVIAR` y `ELIMINAR`. Se reutilizan `BaseCard`, `BaseButton`, `BaseInput` y estados `aria-live` / `role=alert`.

## Risks / Trade-offs

- [Riesgo] El admin vea caducar su sesión a mitad de un envío → Mitigación: la UI detecta `401` y solicita login sin perder el formulario editable.
- [Riesgo] Resend o WhatsApp rechacen el mensaje por plantilla no aprobada → Mitigación: las plantillas deben registrarse antes del despliegue; el error se muestra por canal y el registro no se marca como enviado.
- [Riesgo] Números de WhatsApp con formato inválido → Mitigación: validación estricta en cliente y servidor, normalizando a dígitos con código de país.
- [Riesgo] Filtración de la liga en redes sociales → Mitigación: token de un solo uso y expiración; el admin puede regenerar la invitación.
- [Riesgo] Carrera entre dos canjeos simultáneos → Mitigación: verificar el estado nuevamente justo antes de guardar la reseña y revertir si otra solicitud ya la marcó como canjeada.
- [Riesgo] Cambiar el contrato de `POST /api/reviews` rompa clientes existentes → Mitigación: es un cambio intencional y breaking; se actualizan tests E2E, README y ejemplos.
- [Riesgo] Reutilizar la sesión del blog amplíe el alcance de un administrador → Mitigación: se documenta; si se requiriera separación de roles, será un cambio futuro.
- [Riesgo] Coste por mensaje de WhatsApp → Mitigación: el envío es siempre iniciado explícitamente por el admin, nunca automático.

## Migration Plan

1. Sincronizar primero la spec `client-reviews` del change `add-client-reviews` (que ya está implementado) para que la base canónica exista antes de aplicar el delta `MODIFIED` de este change.
2. Configurar credenciales de Resend y WhatsApp en Netlify, con la plantilla de WhatsApp aprobada previamente.
3. Desplegar Functions y stores nuevos; verificar que `/api/reviews` sigue devolviendo el listado público.
4. Actualizar el frontend: `/resenas` pasa a consultar la validez del token y `ReviewForm.vue` envía `invitationToken`.
5. Verificar flujo completo: alta de cliente → envío → apertura de liga → reseña → token canjeado.
6. Rollback: retirar el requisito de token en `POST /api/reviews` y restaurar `ReviewsView.vue`; los datos de clientes e invitaciones permanecen en Blobs y no afectan al sitio público.

## Open Questions

Ninguna. Los plazos de expiración (30 días), canales (correo, WhatsApp o ambos) y formato de liga (`/resenas?token=...`) quedaron definidos con el usuario y están reflejados en la spec.
