# Design

## Context

Ver `proposal.md` para la motivación.Estado actual relevante:

- `/contacto` usa `ContactForm.vue` con `sendContact()` a Netlify Forms; `index.html` contiene el formulario oculto que Netlify necesita. No hay base de datos de citas.
- `src/stores/booking.ts` guarda en memoria el servicio seleccionado y los campos del formulario; `src/content/services.ts` define duraciones de 60, 90 y 120 minutos.
- El panel `/admin/blog` ya resuelve login, logout, sesión HMAC de 8 horas y verificación de origen (`netlify/lib/blog/auth.ts`).
- Las Functions siguen el patrón `config.path` propio y la lógica reutilizable vive en `netlify/lib/<dominio>/`, con stores de Netlify Blobs y stores en memoria para tests.
- El change `add-review-invitations` define proveedores de Resend y WhatsApp Cloud API y reutiliza la misma sesión; sus adaptadores deben estar desplegados antes de este cambio.
- La CSP actual solo permite `connect-src 'self'`; todas las APIs nuevas son same-origin, por lo que no hace falta ampliarla.
- El spec base de contacto vive en `openspec/changes/origen-consciente-website/specs/contact-booking/spec.md` y aún no está sincronizado a `openspec/specs/`.

## Goals / Non-Goals

**Goals:**

- Publicar disponibilidad real sin depender de acuerdos manuales por correo.
- Garantizar que un horario no pueda reservarse dos veces, incluso con solicitudes simultáneas.
- Conservar el formulario actual como fallback cuando no haya horarios o falle la API.
- Reutilizar la sesión del panel y los proveedores de mensajería ya planeados.
- Mantener el sitio público prerenderizado y sin datos privados en respuestas públicas.

**Non-Goals:**

- Sincronización con Google Calendar u otros calendarios externos.
- Recordatorios automáticos antes de la cita ni confirmaciones interactivas por correo.
- Pago en línea, listas de espera ni múltiples terapeutas con agendas independientes.
- Sustituir Netlify Forms: se conserva para el modo sin disponibilidad.
- Edición de datos de una cita reservada por parte del paciente.

## Decisions

### 1. Disponibilidad híbrida con una sola clave de horario

Se combinan reglas recurrentes y excepciones individuales bajo una clave de horario determinista `slotKey = YYYY-MM-DDTHH:mm` en `America/Mexico_City`.

- Reglas: `rule:<uuid>` con `{ weekday, startTime, durationMinutes, serviceId?, validFrom?, validUntil?, active }`.
- Horarios sueltos o bloqueos: `slot:<uuid>` con `{ startsAt (UTC), durationMinutes, serviceId?, blocked }`.
- Un horario individual en el mismo `slotKey` que una regla la sobrescribe; si está marcado como `blocked`, oculta ese horario generado.
- La generación ocurre en lectura, con un horizonte de **60 días**, y excluye pasados, bloqueados y reservados.

**Alternativa descartada**: materializar todos los horarios generados en Blobs. Genera muchas escrituras y obliga a reprocesar al editar reglas.

### 2. Zona horaria y conversiones

Toda fecha se guarda en UTC (`new Date().toISOString()`) y se interpreta en `America/Mexico_City`. Para derivar el día local y convertir la hora local a UTC se usan `Intl.DateTimeFormat` con `timeZone`, sin agregar dependencias de fechas.

**Alternativa descartada**: guardar fechas locales sin zona. Produciría errores en cambios de horario y en despliegues con otra zona del servidor.

### 3. Reserva atómica con escritura condicional

Netlify Blobs soporta `onlyIfNew` en `set`. El flujo de reserva es:

1. Validar datos y que el `slotKey` esté en el futuro y disponible.
2. Guardar la cita en `appointment:<uuid>`.
3. Escribir el puntero `booking:<slotKey>` con `onlyIfNew: true`.
4. Si el puntero ya existe (otra reserva ganó), eliminar la cita creada y responder `409`.

Cancelar una cita cambia su estado a `cancelada` y elimina el puntero `booking:<slotKey>`, liberando el horario salvo que exista un bloqueo explícito. Para actualizaciones de estado se usa `onlyIfMatch` con el ETag leído.

**Alternativa descartada**: leer y escribir sin condición. Deja una ventana de carrera que puede generar dobles reservas.

### 4. APIs

Functions nuevas con `config.path` propio, siguiendo `admin-posts.ts`:

- `GET /api/appointments/slots?from=YYYY-MM-DD&to=YYYY-MM-DD&serviceId=` — horarios disponibles; sin datos privados.
- `POST /api/appointments` — crear reserva; `201`, `400`, `409`.
- `GET/POST/PATCH/DELETE /api/admin/appointments/rules` — reglas recurrentes.
- `GET/POST/DELETE /api/admin/appointments/slots` — horarios individuales y bloqueos.
- `GET /api/admin/appointments/bookings` — listado de citas.
- `PATCH /api/admin/appointments/bookings?id=...` — cancelar cita.

Todas las rutas admin usan `hasValidSession` e `isAllowedOrigin` con `BLOG_SESSION_SECRET`. Las respuestas siguen el formato `{ error, fields? }` y `Cache-Control: no-store`.

### 5. Formulario único con modo condicional

En lugar de duplicar formularios, `ContactForm.vue` muestra un bloque `AppointmentScheduler.vue` solo cuando hay horarios disponibles. El mismo formulario decide al enviar:

- con `selectedSlotId` → `createAppointment()` y confirmación con fecha y hora;
- sin horario → `sendContact()` exactamente como hoy.

Si la reserva responde `409`, se recarga la disponibilidad, se preservan los datos escritos y se ofrece elegir otro horario.

**Alternativa descartada**: una página de reserva separada. Rompería el flujo servicio → contacto y duplicaría campos.

### 6. Panel `/admin/citas`

Nueva vista `AdminAppointmentsView.vue` con el patrón de `AdminBlogView.vue`: verificación de sesión al montar, login si hace falta, y dos secciones:

- **Disponibilidad**: editor de reglas semanales y lista de excepciones/horarios sueltos, con una cuadrícula mensual simple que marca días con horarios, horarios reservados y bloqueados.
- **Citas**: tabla con fecha, hora, servicio, contacto y estado, con botón `CANCELAR CITA`.

Se reutilizan `BaseCard`, `BaseButton`, `BaseInput`, estados `aria-live` y textos en español. Se agrega un enlace al panel desde `/admin/blog` y viceversa.

### 7. Notificaciones

Se reutiliza la capa de proveedores de `add-review-invitations` (`messaging.ts`) ampliándola con un envío de notificación de cita. El mensaje incluye fecha, hora, servicio, nombre, correo y teléfono del paciente. Si un proveedor no está configurado o falla, se registra el resultado pero la reserva no se revierte.

**Consecuencia**: este change depende de que `add-review-invitations` esté aplicado y desplegado primero; si no, la notificación se omite y se documenta como limitación temporal.

### 8. Seguridad y privacidad

- Las APIs públicas no devuelven correos, teléfonos ni notas; solo horarios.
- El panel exige sesión HMAC válida y verificación de origen en mutaciones.
- Se valida que el horario no esté en el pasado y que los datos de contacto sean correctos.
- Los bots se controlan con el honeypot existente del formulario de contacto.
- No se amplía la CSP porque no hay peticiones a terceros desde el navegador.

## Risks / Trade-offs

- [Riesgo] Confusión por zona horaria o cambio de horario de verano → Mitigación: conversión con `Intl` y almacenamiento en UTC; zona fija `America/Mexico_City`.
- [Riesgo] Doble reserva por carrera → Mitigación: escritura condicional `onlyIfNew` en `booking:<slotKey>` y compensación si falla.
- [Riesgo] Horario mostrado que se ocupa justo antes de enviar → Mitigación: respuesta `409` con recarga de disponibilidad y conservación de datos.
- [Riesgo] Reglas traslapadas que generan horarios inválidos → Mitigación: validación de solapamiento al guardar y deduplicación por `slotKey`.
- [Riesgo] Proveedor de mensajería caído → Mitigación: la cita se guarda igual; el error se registra y se muestra en el panel.
- [Riesgo] El terapeuta olvide publicar horarios → Mitigación: fallback al formulario actual, sin calendario vacío.
- [Riesgo] Dependencia del change de invitaciones → Mitigación: orden de despliegue explícito y degradación sin notificaciones.
- [Riesgo] Cancelar una cita pasada libere un horario histórico → Mitigación: se rechaza la cancelación de citas cuya hora ya pasó.

## Migration Plan

1. Sincronizar primero la spec `contact-booking` del change `origen-consciente-website` para que la base canónica exista antes de aplicar el delta MODIFIED.
2. Aplicar y desplegar `add-review-invitations` para disponer de los proveedores de correo y WhatsApp.
3. Desplegar las Functions y el store de citas sin crear reglas ni horarios: el sitio debe seguir mostrando el formulario actual.
4. Verificar el fallback con la API de horarios caída y con respuesta vacía.
5. Crear reglas de prueba en `/admin/citas` y validar el flujo servicio → contacto → reserva → cancelación.
6. Rollback: eliminar las reglas y horarios publicados; el sitio vuelve automáticamente al formulario de Netlify Forms. Las citas existentes permanecen en Blobs y no afectan al sitio público.

## Open Questions

Ninguna. La disponibilidad combinada (reglas recurrentes e individuales), la reserva inmediata, el alcance del panel y el uso de los proveedores de correo/WhatsApp fueron definidos por el usuario. El horizonte de 60 días y la zona horaria `America/Mexico_City` se registran como decisiones de diseño.
