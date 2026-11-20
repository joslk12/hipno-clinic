# Proposal

## Why

Hoy `/contacto` solo ofrece un formulario que envía un mensaje por Netlify Forms y el terapeuta debe coordinar fecha y hora manualmente por correo o WhatsApp. No hay calendario, disponibilidad publicada ni reservas, lo que genera idas y venidas y permite proponer horarios que ya están ocupados.

## What Changes

- Se agrega un panel `/admin/citas` protegido con la sesión administrativa existente para que el terapeuta administre:
  - reglas de disponibilidad recurrente por día de la semana y hora;
  - horarios individuales o excepciones (bloquear/desbloquear fechas concretas);
  - citas reservadas, con opción de cancelar y liberar el horario.
- Cuando exista disponibilidad publicada, `/contacto` mostrará un calendario con los horarios seleccionables además de los campos de contacto actuales; al enviar, la cita se reserva de inmediato y el horario deja de estar disponible.
- Cuando no haya disponibilidad configurada, `/contacto` seguirá mostrando exactamente el formulario actual y el envío continuará por Netlify Forms para que el terapeuta lo gestione manualmente.
- Se agregan APIs públicas para consultar horarios disponibles y crear reservas, con control de dobles reservas.
- Las nuevas citas notifican al terapeuta por correo y WhatsApp reutilizando los proveedores del change `add-review-invitations`.
- **BREAKING (solo cuando hay disponibilidad configurada)**: el envío deja de ir a Netlify Forms y pasa a crear una reserva en la API; el modo sin disponibilidad no cambia.
- Se documentan las nuevas reglas, la zona horaria y el orden de despliegue.

## Capabilities

### New Capabilities

- `appointment-scheduling`: disponibilidad recurrente e individual, consulta de horarios, reserva inmediata sin dobles reservas, administración de citas y notificaciones al terapeuta.

### Modified Capabilities

- `contact-booking`: el formulario de contacto pasa a mostrar el calendario de forma condicional y, cuando hay horarios publicados, el envío crea una reserva en lugar de enviar solo un mensaje. El spec base está en `openspec/changes/origen-consciente-website/specs/contact-booking/spec.md` y debe sincronizarse antes que este change.

## Impact

- **Frontend**: `ContactForm.vue`, `ContactView.vue`, `src/stores/booking.ts`, `src/services/contact.ts`, nuevos componentes de calendario y vista bajo `src/views/admin/`, `src/router/index.ts`, `src/types/`.
- **Backend**: nuevas Functions y lógica en `netlify/lib/appointments/`, reutilizando la autenticación HMAC de `netlify/lib/blog/auth.ts` y los adaptadores de mensajería de `netlify/lib/review-invitations/messaging.ts`.
- **Datos**: nuevo store de Netlify Blobs para reglas, horarios, reservas y excepciones; el formulario de Netlify Forms se conserva solo para el modo sin disponibilidad.
- **Seguridad**: sesión administrativa para el panel, validación de horarios pasados o duplicados y APIs públicas sin datos administrativos.
- **Integraciones y configuración**: zona horaria `America/Mexico_City`, Resend y WhatsApp Cloud API; no se requieren nuevas variables si ya se desplegó `add-review-invitations`.
- **Pruebas y documentación**: unitarias, E2E del flujo servicio → contacto → reserva, fallback sin horarios y README.
