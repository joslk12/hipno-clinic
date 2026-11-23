# Tasks

## 1. Preparación y contratos

- [x] 1.1 Definir los tipos compartidos en `src/types/appointments.ts` (`AvailabilityRule`, `ScheduleSlot`, `Appointment`, payloads y respuestas); verificado con `npm run typecheck`.
- [x] 1.2 Crear `src/content/appointments.ts` con el horizonte de 60 días, la zona `America/Mexico_City` y los formatters en `es-MX`; verificado con `npx vitest run src/content/__tests__/appointments.spec.ts`.
- [x] 1.3 Confirmar que ninguna API nueva requiere dominios externos en el navegador y que `public/_headers` mantiene `connect-src 'self'`; verificado con `npx playwright test tests/e2e/network.spec.ts`.
- [x] 1.4 Documentar `DATABASE_URL`/`NETLIFY_DATABASE_URL` como variable secreta y el esquema idempotente en `netlify/lib/db/schema.ts`; verificado con `npm run typecheck`.

## 2. Store y generación de horarios

- [x] 2.1 Implementar `netlify/lib/appointments/store.ts` con repositorios de Postgres para reglas, horarios individuales y reservas, además del store en memoria para tests; verificado con `npx vitest run netlify/lib/appointments/__tests__/store.spec.ts`.
- [x] 2.2 Implementar `netlify/lib/appointments/slots.ts` para generar horarios desde reglas recurrentes, aplicar excepciones, excluir pasados y reservados, y deduplicar por `slotKey`; verificado con `npx vitest run netlify/lib/appointments/__tests__/slots.spec.ts`.
- [x] 2.3 Implementar la conversión local/UTC con `Intl.DateTimeFormat` y las validaciones de entrada y solapamiento; verificado con `npx vitest run netlify/lib/appointments/__tests__/timezone.spec.ts` y `validation.spec.ts`.

## 3. APIs públicas de disponibilidad y reserva

- [x] 3.1 Crear `netlify/functions/appointment-slots.ts` con `GET /api/appointments/slots`, filtros por rango y servicio, y respuestas sin datos privados; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts`.
- [x] 3.2 Crear `netlify/functions/appointments.ts` con `POST /api/appointments`, validación de datos e índice único parcial (`ON CONFLICT DO NOTHING RETURNING`), respondiendo `201`, `400`, `409` y `503`; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts`, incluida la doble reserva.
- [x] 3.3 Documentar en `README.md` las rutas públicas nuevas, el formato de fechas y el comportamiento `409`; verificado contra las respuestas implementadas.

## 4. APIs administrativas

- [x] 4.1 Crear `netlify/functions/admin-appointment-rules.ts` con CRUD de reglas, reutilizando sesión HMAC y `isAllowedOrigin`; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts` (`200`, `400`, `401` y solapamientos).
- [x] 4.2 Crear `netlify/functions/admin-appointment-slots.ts` para alta de horarios individuales, bloqueo y desbloqueo; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts`.
- [x] 4.3 Crear `netlify/functions/admin-appointments.ts` con `GET` de citas y `PATCH` para cancelar liberando el horario gracias al índice parcial; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts`.

## 5. Notificaciones al terapeuta

- [x] 5.1 Crear `netlify/lib/appointments/notifications.ts` con el envío de notificación de cita por Resend y WhatsApp Cloud API, reutilizando credenciales y resultados por proveedor; verificado con `npx vitest run netlify/lib/appointments/__tests__/notifications.spec.ts`.
- [x] 5.2 Integrar la notificación en el flujo de reserva sin revertir la cita si el proveedor falla; verificado en `netlify/lib/appointments/__tests__/handlers.spec.ts` y `notifications.spec.ts`.
- [x] 5.3 Documentar en `README.md` la dependencia de `add-review-invitations`, el contenido del aviso y la degradación cuando no hay proveedores; verificado sin credenciales en la documentación.

## 6. Frontend público

- [x] 6.1 Crear `src/services/appointments.ts` con `listAvailableSlots` y `createAppointment`, errores tipados y mapeo de `409`; verificado con `npx vitest run src/services/__tests__/appointments.spec.ts`.
- [x] 6.2 Ampliar `src/stores/booking.ts` con el horario seleccionado y sus errores, manteniendo el flujo del servicio elegido; verificado con `npx vitest run src/stores/__tests__/booking.spec.ts`.
- [x] 6.3 Crear `src/components/sections/AppointmentScheduler.vue` con cuadrícula mensual, fechas con horarios, selección de hora y estados de carga/error; verificado con `npx vitest run src/components/sections/__tests__/appointment-scheduler.spec.ts`.
- [x] 6.4 Modificar `ContactForm.vue` para mostrar el calendario solo con horarios disponibles, reservar cuando haya horario elegido y conservar `sendContact` como fallback; verificado con `npx vitest run src/components/sections/__tests__/contact-form.spec.ts`.
- [x] 6.5 Actualizar `tests/e2e/booking-flow.spec.ts` con mocks de disponibilidad para el flujo con reserva, el fallback sin horarios y el error del API; verificado con `npx playwright test tests/e2e/booking-flow.spec.ts` y `npx playwright test tests/e2e/a11y.spec.ts`.

## 7. Panel `/admin/citas`

- [x] 7.1 Crear `src/services/adminAppointments.ts` con las llamadas a reglas, horarios y citas, usando `credentials: 'same-origin'` y errores tipados; verificado con `npx vitest run src/services/__tests__/adminAppointments.spec.ts`.
- [x] 7.2 Crear `src/views/admin/AdminAppointmentsView.vue` con verificación de sesión, login, logout y navegación hacia `/admin/blog`; verificado con `npx vitest run src/views/admin/__tests__/admin-appointments-view.spec.ts`.
- [x] 7.3 Crear `src/components/admin/AdminAvailabilityEditor.vue` con reglas semanales, horarios individuales, bloqueos y cuadrícula mensual; verificado con `npx vitest run src/components/admin/__tests__/admin-availability-editor.spec.ts`.
- [x] 7.4 Crear `src/components/admin/AdminAppointmentList.vue` con el listado de citas y la acción `CANCELAR CITA`; verificado con `npx vitest run src/components/admin/__tests__/admin-appointment-list.spec.ts`.
- [x] 7.5 Registrar `/admin/citas` en el router, excluirlo del prerenderizado en `vite.config.ts` y desautorizarlo en robots; verificado con `npm run build` y `npx vitest run src/router`.
- [x] 7.6 Crear `tests/e2e/admin-appointments.spec.ts` con mocks de sesión y APIs para login, crear regla, bloquear horario, listar citas y cancelar; verificado con `npx playwright test tests/e2e/admin-appointments.spec.ts`.

## 8. Integración y verificación final

- [x] 8.1 Actualizar `README.md` con el flujo del calendario, el panel, las APIs, la zona horaria y el orden de despliegue; verificado sin referencias a Netlify Forms como único mecanismo.
- [x] 8.2 Ejecutar `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx playwright test`; 310 tests unitarios y 94 pruebas E2E pasan.
- [x] 8.3 Ejecutar `openspec validate add-appointment-calendar --strict` y confirmar que el cambio es válido.

## Workflow follow-up

- Sincronizar la spec `contact-booking` del change `origen-consciente-website` antes de archivar este change.
- Aplicar y desplegar `add-review-invitations` antes de este cambio para habilitar correo y WhatsApp.
- Desplegar sin reglas de disponibilidad, verificar el fallback y después cargar los horarios reales desde `/admin/citas`.
- Probar en producción reserva, cancelación, liberación del horario y recepción de notificaciones.
