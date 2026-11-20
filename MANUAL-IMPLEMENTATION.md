# Implementación manual — reseñas por invitación y calendario de citas

Este archivo es el runbook para aplicar manualmente, en orden, los cambios planeados:

1. `add-client-reviews` (cierre/sincronización; ya está implementado).
2. `add-review-invitations` (invitaciones de reseñas).
3. `add-appointment-calendar` (calendario y reservas).

Todos los comandos se ejecutan desde:

```bash
cd /Users/jose-trinidad/Sites/hipno-clinic
```

> **Contenido de los archivos, paso a paso:**
>
> - `MANUAL-FILES-REVIEW-INVITATIONS.md` — código exacto de `add-review-invitations` (contratos, backend, frontend y panel).
> - `MANUAL-TESTS-REVIEW-INVITATIONS.md` — contenido de todos los tests de ese change.
>
> Cuando termines `add-review-invitations`, dime y genero los equivalentes para `add-appointment-calendar`.

## Progreso

- [ ] Paso 0 — Cerrar y sincronizar `add-client-reviews`
- [ ] Paso 1 — Implementar `add-review-invitations`
- [ ] Paso 2 — Sincronizar `contact-booking`
- [ ] Paso 3 — Implementar `add-appointment-calendar`
- [ ] Paso 4 — Configurar Netlify y verificar en producción

---

# Paso 0 — Cerrar `add-client-reviews`

Ya está implementado y con todas las tareas marcadas. Solo hay que sincronizar su spec y archivarlo.

```bash
openspec validate add-client-reviews --strict
openspec archive add-client-reviews -y
openspec list --specs
```

Después de eso debe aparecer `client-reviews` en `openspec list --specs`.

Verificación en producción:

```bash
export REVIEWS_ADMIN_TOKEN='tu-token-real'

curl -s https://origenconsciente.mx/api/reviews | head -c 500
curl -s -H "Authorization: Bearer $REVIEWS_ADMIN_TOKEN" \
  'https://origenconsciente.mx/api/reviews?status=pending'
```

Si prefieres **sincronizar sin archivar**, ejecuta en OpenCode:

```text
/opsx-sync add-client-reviews
```

---

# Paso 1 — Implementar `add-review-invitations`

## 1.1 Arrancar el apply

```bash
openspec instructions apply --change add-review-invitations --json
openspec status --change add-review-invitations
```

Abre `openspec/changes/add-review-invitations/tasks.md`. Trabaja grupo por grupo y cambia `- [ ]` por `- [x]` solo cuando la verificación de esa tarea pase.

> No hay que tocar `vite.config.ts` ni `robots.txt`: el patrón `/admin` ya excluye `/admin/resenas` del prerender y robots ya desautoriza `/admin`.

## 1.2 Grupo 1 — Preparación y contratos

Archivos:

- Crear `src/types/review-invitations.ts`.
- Editar `src/types/reviews.ts` → agregar `invitationToken?: string` a `CreateReviewPayload`.
- Editar `.env.example` → agregar:

```dotenv
RESEND_API_KEY=re_replace_me
REVIEWS_FROM_EMAIL=Origen Consciente <hola@origenconsciente.mx>
WHATSAPP_ACCESS_TOKEN=replace-me
WHATSAPP_PHONE_NUMBER_ID=replace-me
```

- Editar `public/_headers` → cambiar:

```diff
- connect-src 'self';
+ connect-src 'self' https://api.resend.com https://graph.facebook.com;
```

Verificar:

```bash
npm run typecheck
npx playwright test tests/e2e/network.spec.ts
```

## 1.3 Grupo 2 — Stores y token

Archivos:

- `netlify/lib/review-invitations/store.ts` — `ClientStore`, `InvitationStore`, adaptadores Blobs (`clients`, `review-invitations`) y stores en memoria.
- `netlify/lib/review-invitations/token.ts` — generación y hash.

Lógica exacta del token:

```ts
import { createHash, randomBytes } from 'node:crypto'

export const INVITATION_TTL_DAYS = 30

export function createInvitationToken() {
  return randomBytes(32).toString('base64url')
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function invitationExpiry(now = new Date()) {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
```

Claves Blobs:

```text
client:<uuid>
invitation:<hash>
```

El registro de invitación debe guardar:

```ts
{
  id: string
  clientId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  status: 'pendiente' | 'enviada' | 'canjeada' | 'expirada'
  history: Array<{ channel: 'email' | 'whatsapp'; sentAt: string; ok: boolean; error?: string }>
}
```

Verificar:

```bash
npx vitest run netlify/lib/review-invitations/__tests__/token.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/store.spec.ts
```

## 1.4 Grupo 3 — Validación y mensajería

Archivos:

- `netlify/lib/review-invitations/validation.ts`.
- `netlify/lib/review-invitations/messaging.ts`.

Contratos:

```ts
export interface InvitationSender {
  sendEmail(input: { to: string; name: string; link: string }): Promise<SendResult>
  sendWhatsApp(input: { to: string; name: string; link: string }): Promise<SendResult>
}

export interface SendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}
```

El link debe construirse así:

```ts
const link = `${siteUrl}/resenas?token=${token}`
```

donde `siteUrl = process.env.VITE_SITE_URL || process.env.URL`.

Llamadas:

```text
POST https://api.resend.com/emails
POST https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
```

con `AbortSignal.timeout(10_000)`.

Verificar:

```bash
npx vitest run netlify/lib/review-invitations/__tests__/validation.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/messaging.spec.ts
```

## 1.5 Grupo 4 — Funciones del panel

Archivos:

- `netlify/lib/review-invitations/handlers.ts` — factories de handlers.
- `netlify/functions/admin-review-clients.ts`
- `netlify/functions/admin-review-invitations.ts`
- `netlify/functions/review-invitation.ts`

Rutas exactas:

```text
GET/POST/PATCH/DELETE /api/admin/review-clients
GET/POST               /api/admin/review-invitations
GET                    /api/reviews/invitation?token=...
```

En todas las rutas `/api/admin/*`:

```ts
import { hasValidSession, isAllowedOrigin } from '../lib/blog/auth'

if (process.env.BLOG_SESSION_SECRET === undefined) return json(503, ...)
if (!hasValidSession(request, process.env.BLOG_SESSION_SECRET)) return json(401, ...)
if (!isAllowedOrigin(request)) return json(403, ...)
```

La ruta pública devuelve solo:

```ts
{ valid: boolean }
```

Nunca devuelve nombre, correo ni teléfono.

Verificar:

```bash
npx vitest run netlify/lib/review-invitations/__tests__/clients-handler.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/invitations-handler.spec.ts
npx vitest run netlify/lib/review-invitations/__tests__/public-invitation.spec.ts
```

## 1.6 Grupo 5 — Restringir reseñas

Editar `netlify/lib/reviews/handler.ts`:

1. En `handlePost`, después de `validateReviewInput`, exigir `input.invitationToken`.
2. Calcular `hashInvitationToken(input.invitationToken)`.
3. Si no existe, expiró o está canjeada → `401`/`403`.
4. Después de guardar la reseña, marcar la invitación como `canjeada` con escritura condicional:

```ts
await store.redeemInvitation(hash, etag) // usa onlyIfMatch
```

5. Si el canjeo falla por carrera, borrar la reseña recién creada y responder `409`.

Editar `netlify/functions/reviews.ts` para inyectar el nuevo store.

Verificar:

```bash
npx vitest run netlify/lib/reviews
npm run typecheck
npx playwright test tests/e2e/reviews.spec.ts
```

## 1.7 Grupo 6 — Frontend público

Archivos:

- `src/services/reviews.ts` → `checkInvitation(token)` y `invitationToken` en `createReview`.
- `src/views/ReviewsView.vue` → leer `route.query.token`, validar y condicionar `ReviewForm`.
- `src/components/sections/ReviewForm.vue` → prop `token`, enviarlo sin mostrarlo.
- Actualizar textos de `/resenas`.

Verificar:

```bash
npx vitest run src/services/__tests__/reviews.spec.ts
npx vitest run src/views/__tests__/reviews-view.spec.ts
npx vitest run src/components/sections/__tests__/review-form.spec.ts
npx playwright test tests/e2e/reviews.spec.ts tests/e2e/a11y.spec.ts
```

## 1.8 Grupo 7 — Panel `/admin/resenas`

Archivos nuevos:

```text
src/services/adminReviewInvitations.ts
src/views/admin/AdminReviewsView.vue
src/components/admin/AdminReviewClientList.vue
src/components/admin/AdminReviewClientForm.vue
src/components/admin/AdminReviewInvitationActions.vue
tests/e2e/admin-reviews.spec.ts
```

Editar `src/router/index.ts`:

```ts
{
  path: '/admin/resenas',
  name: 'admin-reviews',
  component: () => import('@/views/admin/AdminReviewsView.vue')
}
```

Verificar:

```bash
npx vitest run src/services/__tests__/admin-review-invitations.spec.ts
npx vitest run src/views/admin/__tests__/admin-reviews-view.spec.ts
npx vitest run src/components/admin/__tests__/admin-review-clients.spec.ts
npx vitest run src/components/admin/__tests__/admin-review-invitations.spec.ts
npm run build
npx playwright test tests/e2e/admin-reviews.spec.ts
```

## 1.9 Cierre de `add-review-invitations`

```bash
npx vitest run
npm run typecheck
npm run lint
npm run build
npx playwright test
openspec validate add-review-invitations --strict
openspec archive add-review-invitations -y
```

---

# Paso 2 — Sincronizar `contact-booking`

Antes de archivar el change de citas hay que sincronizar `contact-booking`. En OpenCode:

```text
/opsx-sync origen-consciente-website
```

Luego:

```bash
openspec list --specs
```

Debe aparecer `contact-booking`.

---

# Paso 3 — Implementar `add-appointment-calendar`

## 3.1 Arrancar el apply

```bash
openspec instructions apply --change add-appointment-calendar --json
openspec status --change add-appointment-calendar
```

## 3.2 Grupo 1 — Contratos

Archivos:

```text
src/types/appointments.ts
src/content/appointments.ts
```

Constantes exactas:

```ts
export const APPOINTMENT_TIME_ZONE = 'America/Mexico_City'
export const APPOINTMENT_HORIZON_DAYS = 60
```

Verificar:

```bash
npm run typecheck
npx vitest run src/content/__tests__/appointments.spec.ts
npx playwright test tests/e2e/network.spec.ts
```

## 3.3 Grupo 2 — Store, horarios y zona horaria

Archivos:

```text
netlify/lib/appointments/store.ts
netlify/lib/appointments/slots.ts
netlify/lib/appointments/timezone.ts
```

Clave de horario:

```ts
const slotKey = `${localDate}T${HH:mm}` // America/Mexico_City
```

Claves Blobs:

```text
rule:<uuid>
slot:<uuid>
appointment:<uuid>
booking:<slotKey>
```

La generación de horarios ocurre en lectura, excluye pasados, bloqueados y reservados, y deduplica por `slotKey`.

Verificar:

```bash
npx vitest run netlify/lib/appointments/__tests__/store.spec.ts
npx vitest run netlify/lib/appointments/__tests__/slots.spec.ts
npx vitest run netlify/lib/appointments/__tests__/timezone.spec.ts
```

## 3.4 Grupo 3 — APIs públicas

Archivos:

```text
netlify/functions/appointment-slots.ts
netlify/functions/appointments.ts
netlify/lib/appointments/handlers.ts
```

Reserva atómica:

```ts
const appointment = { id: randomUUID(), slotKey, status: 'reservada', ... }
await store.saveAppointment(appointment)

const result = await store.reserveSlot(slotKey, appointment.id, { onlyIfNew: true })
if (!result.modified) {
  await store.deleteAppointment(appointment.id)
  return errorResponse(409, 'Ese horario ya fue reservado.')
}
```

Verificar:

```bash
npx vitest run netlify/lib/appointments/__tests__/slots-handler.spec.ts
npx vitest run netlify/lib/appointments/__tests__/appointments-handler.spec.ts
```

## 3.5 Grupo 4 — APIs admin

Archivos:

```text
netlify/functions/admin-appointment-rules.ts
netlify/functions/admin-appointment-slots.ts
netlify/functions/admin-appointments.ts
```

Rutas:

```text
GET/POST/PATCH/DELETE /api/admin/appointments/rules
GET/POST/DELETE       /api/admin/appointments/slots
GET                   /api/admin/appointments/bookings
PATCH                 /api/admin/appointments/bookings?id=...
```

Cancelar debe:

1. Cambiar estado a `cancelada` con `onlyIfMatch`.
2. Borrar `booking:<slotKey>`.
3. Rechazar citas cuya hora ya pasó.

Verificar:

```bash
npx vitest run netlify/lib/appointments/__tests__/admin-rules.spec.ts
npx vitest run netlify/lib/appointments/__tests__/admin-slots.spec.ts
npx vitest run netlify/lib/appointments/__tests__/admin-appointments.spec.ts
```

## 3.6 Grupo 5 — Notificaciones

Editar `netlify/lib/review-invitations/messaging.ts` y crear:

```text
netlify/lib/appointments/notifications.ts
```

El aviso debe incluir fecha, hora, servicio, nombre, correo y teléfono. Si falla el proveedor, la cita **no** se revierte.

Verificar:

```bash
npx vitest run netlify/lib/review-invitations/__tests__/messaging.spec.ts
npx vitest run netlify/lib/appointments/__tests__/notifications.spec.ts
```

## 3.7 Grupo 6 — Frontend público

Archivos:

```text
src/services/appointments.ts
src/components/sections/AppointmentScheduler.vue
tests/e2e/booking-flow.spec.ts
```

Editar:

```text
src/stores/booking.ts
src/components/sections/ContactForm.vue
```

Regla de decisión en `ContactForm.vue`:

```ts
if (booking.selectedSlotId) {
  await createAppointment({ ...datos, slotId: booking.selectedSlotId })
} else {
  await sendContact(datos)
}
```

Si `createAppointment` devuelve `409`: recargar horarios, conservar campos y mostrar error.

Verificar:

```bash
npx vitest run src/services/__tests__/appointments.spec.ts
npx vitest run src/stores/__tests__/booking.spec.ts
npx vitest run src/components/sections/__tests__/appointment-scheduler.spec.ts
npx vitest run src/components/sections/__tests__/contact-form.spec.ts
npx playwright test tests/e2e/booking-flow.spec.ts tests/e2e/a11y.spec.ts
```

## 3.8 Grupo 7 — Panel `/admin/citas`

Archivos:

```text
src/services/adminAppointments.ts
src/views/admin/AdminAppointmentsView.vue
src/components/admin/AdminAvailabilityEditor.vue
src/components/admin/AdminAppointmentList.vue
tests/e2e/admin-appointments.spec.ts
```

Editar `src/router/index.ts`:

```ts
{
  path: '/admin/citas',
  name: 'admin-appointments',
  component: () => import('@/views/admin/AdminAppointmentsView.vue')
}
```

De nuevo: **no hay que editar** `vite.config.ts` ni `robots.txt`; ya cubren `/admin`.

Verificar:

```bash
npx vitest run src/services/__tests__/adminAppointments.spec.ts
npx vitest run src/views/admin/__tests__/admin-appointments-view.spec.ts
npx vitest run src/components/admin/__tests__/admin-availability-editor.spec.ts
npx vitest run src/components/admin/__tests__/admin-appointment-list.spec.ts
npm run build
npx playwright test tests/e2e/admin-appointments.spec.ts
```

## 3.9 Cierre de `add-appointment-calendar`

```bash
npx vitest run
npm run typecheck
npm run lint
npm run build
npx playwright test
openspec validate add-appointment-calendar --strict
openspec archive add-appointment-calendar -y
```

---

# Paso 4 — Configuración en Netlify

Variables que deben existir en **Netlify → Site configuration → Environment variables**:

```dotenv
REVIEWS_ADMIN_TOKEN=...
REVIEWS_RATE_SALT=...
BLOG_ADMIN_PASSWORD=...
BLOG_SESSION_SECRET=...
BLOG_BUILD_HOOK_URL=...
BLOG_API_URL=...
RESEND_API_KEY=...
REVIEWS_FROM_EMAIL=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

Antes de habilitar WhatsApp, la plantilla debe estar aprobada en Meta.

Despliegue:

```bash
npx netlify-cli login
npx netlify-cli link
npm run deploy
```

## Verificación final en producción

```bash
# reseñas: sin token NO debe haber formulario
curl -s 'https://origenconsciente.mx/api/reviews' | head -c 500

# invitación inválida
curl -s 'https://origenconsciente.mx/api/reviews/invitation?token=bad'

# horarios: sin reglas debe devolver []
curl -s 'https://origenconsciente.mx/api/appointments/slots?from=2026-11-18&to=2026-12-18'
```

Checklist manual en el navegador:

1. `/resenas` sin token → no aparece formulario.
2. `/admin/resenas` sin sesión → pide login.
3. Alta de cliente → enviar liga → abrir liga → publicar reseña → el token queda canjeado.
4. `/admin/citas` sin reglas → `/contacto` muestra el formulario clásico.
5. Crear regla semanal → `/contacto` muestra calendario.
6. Reservar → horario desaparece → cancelar desde admin → horario reaparece.
7. Confirmar recepción de correo y WhatsApp.

---

# Notas que evitan errores

- El INFO de `openspec validate --strict` sobre deltas `MODIFIED` desaparece cuando la spec base ya está en `openspec/specs/`. Por eso el Paso 0 va primero.
- No edites `vite.config.ts` ni `robots.txt` para las rutas admin: ya están cubiertas.
- Usa `openspec instructions apply --change <nombre> --json` para obtener el número de línea exacto de cada checkbox antes de marcarlo.
- No marques una tarea como `[x]` hasta que su comando de verificación pase.
- Cada cambio tiene su checklist autoritativa en `openspec/changes/<nombre>/tasks.md`; este archivo es el índice operativo, no la reemplaza.
