# Tasks

## 1. Preparación y contratos

- [ ] 1.1 Definir los tipos compartidos en `src/types/appointments.ts` (`AvailabilityRule`, `ScheduleSlot`, `Appointment`, payloads y respuestas) y verificar con `npm run typecheck`.
- [ ] 1.2 Crear `src/content/appointments.ts` con el horizonte de 60 días, la zona `America/Mexico_City` y los formatters en `es-MX`; verificar con `npx vitest run src/content/__tests__/appointments.spec.ts`.
- [ ] 1.3 Confirmar que ninguna API nueva requiere dominios externos en el navegador y que `public/_headers` mantiene `connect-src 'self'`; verificar con `npx playwright test tests/e2e/network.spec.ts`.

## 2. Store y generación de horarios

- [ ] 2.1 Implementar `netlify/lib/appointments/store.ts` con los stores de Blobs y en memoria para reglas, horarios individuales, reservas y punteros `booking:<slotKey>`; verificar con `npx vitest run netlify/lib/appointments/__tests__/store.spec.ts`.
- [ ] 2.2 Implementar `netlify/lib/appointments/slots.ts` para generar horarios desde reglas recurrentes, aplicar excepciones, excluir pasados y reservados, y deduplicar por `slotKey`; verificar con `npx vitest run netlify/lib/appointments/__tests__/slots.spec.ts` incluyendo cruces de mes y zona horaria.
- [ ] 2.3 Implementar la conversión local/UTC con `Intl.DateTimeFormat` y validaciones de solapamiento de reglas; verificar con `npx vitest run netlify/lib/appointments/__tests__/timezone.spec.ts`.

## 3. APIs públicas de disponibilidad y reserva

- [ ] 3.1 Crear `netlify/functions/appointment-slots.ts` con `GET /api/appointments/slots`, filtros por rango y servicio, y respuestas sin datos privados; verificar `200`, lista vacía y errores con `npx vitest run netlify/lib/appointments/__tests__/slots-handler.spec.ts`.
- [ ] 3.2 Crear `netlify/functions/appointments.ts` con `POST /api/appointments`, validación de datos, escritura condicional `onlyIfNew` y compensación, respondiendo `201`, `400` y `409`; verificar incluyendo un caso de doble reserva simultánea con `npx vitest run netlify/lib/appointments/__tests__/appointments-handler.spec.ts`.
- [ ] 3.3 Documentar en `README.md` las rutas públicas nuevas, el formato de fechas y el comportamiento `409`; verificar que los ejemplos coinciden con las respuestas implementadas.

## 4. APIs administrativas

- [ ] 4.1 Crear `netlify/functions/admin-appointment-rules.ts` con CRUD de reglas, reutilizando sesión HMAC y `isAllowedOrigin`; verificar `200`, `400`, `401` y solapamientos rechazados con `npx vitest run netlify/lib/appointments/__tests__/admin-rules.spec.ts`.
- [ ] 4.2 Crear `netlify/functions/admin-appointment-slots.ts` para alta de horarios individuales, bloqueo y desbloqueo; verificar horizontes, fechas pasadas y bloqueos con `npx vitest run netlify/lib/appointments/__tests__/admin-slots.spec.ts`.
- [ ] 4.3 Crear `netlify/functions/admin-appointments.ts` con `GET` de citas y `PATCH` para cancelar liberando el puntero; verificar listado, cancelación, cita pasada rechazada y acceso anónimo con `npx vitest run netlify/lib/appointments/__tests__/admin-appointments.spec.ts`.

## 5. Notificaciones al terapeuta

- [ ] 5.1 Ampliar `netlify/lib/review-invitations/messaging.ts` con el envío de notificación de cita por Resend y WhatsApp, reutilizando credenciales y resultados por proveedor; verificar con `npx vitest run netlify/lib/review-invitations/__tests__/messaging.spec.ts`.
- [ ] 5.2 Integrar la notificación en el flujo de reserva sin revertir la cita si el proveedor falla; verificar con `npx vitest run netlify/lib/appointments/__tests__/notifications.spec.ts`.
- [ ] 5.3 Documentar en `README.md` la dependencia de `add-review-invitations`, el contenido del aviso y la degradación cuando no hay proveedores; verificar que no aparezcan credenciales en la documentación.

## 6. Frontend público

- [ ] 6.1 Crear `src/services/appointments.ts` con `listAvailableSlots` y `createAppointment`, errores tipados y mapeo de `409`; verificar con `npx vitest run src/services/__tests__/appointments.spec.ts`.
- [ ] 6.2 Ampliar `src/stores/booking.ts` con el horario seleccionado y sus errores, manteniendo el flujo del servicio elegido; verificar con `npx vitest run src/stores/__tests__/booking.spec.ts`.
- [ ] 6.3 Crear `src/components/sections/AppointmentScheduler.vue` con cuadrícula mensual, fechas con horarios, selección de hora y estados de carga/error; verificar accesibilidad por teclado y lector de pantalla con `npx vitest run src/components/sections/__tests__/appointment-scheduler.spec.ts`.
- [ ] 6.4 Modificar `ContactForm.vue` para mostrar el calendario solo con horarios disponibles, reservar cuando haya horario elegido y conservar `sendContact` como fallback; verificar ambos modos y el `409` con `npx vitest run src/components/sections/__tests__/contact-form.spec.ts`.
- [ ] 6.5 Actualizar `tests/e2e/booking-flow.spec.ts` con mocks de disponibilidad para el flujo con reserva, el fallback sin horarios y el error del API; verificar con `npx playwright test tests/e2e/booking-flow.spec.ts` y `npx playwright test tests/e2e/a11y.spec.ts`.

## 7. Panel `/admin/citas`

- [ ] 7.1 Crear `src/services/adminAppointments.ts` con las llamadas a reglas, horarios y citas, usando `credentials: 'same-origin'` y errores tipados; verificar con `npx vitest run src/services/__tests__/adminAppointments.spec.ts`.
- [ ] 7.2 Crear `src/views/admin/AdminAppointmentsView.vue` con verificación de sesión, login, logout y navegación hacia `/admin/blog`; verificar con `npx vitest run src/views/admin/__tests__/admin-appointments-view.spec.ts`.
- [ ] 7.3 Crear `src/components/admin/AdminAvailabilityEditor.vue` con reglas semanales, horarios individuales, bloqueos y cuadrícula mensual; verificar altas, edición, bloqueo y errores con `npx vitest run src/components/admin/__tests__/admin-availability-editor.spec.ts`.
- [ ] 7.4 Crear `src/components/admin/AdminAppointmentList.vue` con el listado de citas y la acción `CANCELAR CITA`; verificar con `npx vitest run src/components/admin/__tests__/admin-appointment-list.spec.ts`.
- [ ] 7.5 Registrar `/admin/citas` en el router, excluirlo del prerenderizado en `vite.config.ts` y desautorizarlo en robots; verificar con `npm run build` y `npx vitest run src/router`.
- [ ] 7.6 Crear `tests/e2e/admin-appointments.spec.ts` con mocks de sesión y APIs para login, crear regla, bloquear horario, listar citas y cancelar; verificar con `npx playwright test tests/e2e/admin-appointments.spec.ts`.

## 8. Integración y verificación final

- [ ] 8.1 Actualizar `README.md` con el flujo del calendario, el panel, las APIs, la zona horaria y el orden de despliegue; verificar que no queden referencias a que el único mecanismo sea Netlify Forms.
- [ ] 8.2 Ejecutar `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx playwright test`; corregir cualquier fallo.
- [ ] 8.3 Ejecutar `openspec validate add-appointment-calendar --strict` y confirmar que el cambio es válido.

## Workflow follow-up

- Sincronizar la spec `contact-booking` del change `origen-consciente-website` antes de archivar este change.
- Aplicar y desplegar `add-review-invitations` antes de este cambio para habilitar correo y WhatsApp.
- Desplegar sin reglas de disponibilidad, verificar el fallback y después cargar los horarios reales desde `/admin/citas`.
- Probar en producción reserva, cancelación, liberación del horario y recepción de notificaciones.
