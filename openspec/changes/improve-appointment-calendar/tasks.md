# Tasks

## 1. Etiqueta del mes

- [x] 1.1 Corregir `formatMonthLabel()` en `src/content/appointments.ts` para convertir el mes 1..12 a índice 0..11 antes de `Date.UTC`.
- [x] 1.2 Cubrir noviembre, diciembre y enero en `src/content/__tests__/appointments.spec.ts` y comprobar el caption en `appointment-scheduler.spec.ts`.

## 2. Calendario administrativo editable

- [x] 2.1 Convertir las celdas en botones que seleccionen el día y sincronicen el formulario de horario individual.
- [x] 2.2 Derivar y mostrar las horas del día desde reglas, horarios materializados y citas, con su estado.
- [x] 2.3 Agregar bloqueo/desbloqueo por hora y bloqueo de un rango «desde aquí» con límite configurable, creando los horarios manuales que falten.
- [x] 2.4 Cubrir los tres flujos con pruebas unitarias.

## 3. Cuadrícula días × horas

- [x] 3.1 Definir `APPOINTMENTS_FIRST_START`/`APPOINTMENTS_LAST_START` en `src/types/appointments.ts` y `isBookableTime()` en `netlify/lib/appointments/timezone.ts`.
- [x] 3.2 Validar el rango `06:00`–`22:00` en reglas y horarios manuales, y filtrar reglas/slots fuera de rango en `buildSlotCatalog()`.
- [x] 3.3 Sustituir el formulario de reglas por la cuadrícula con selección de celdas, filas y columnas, perfil común y guardado por diff en `AdminAvailabilityEditor.vue`.
- [x] 3.4 Mostrar el aviso de reglas antiguas fuera de rango y el botón para eliminarlas; ocultarlas de la cuadrícula, del calendario y de la tabla.
- [x] 3.5 Permitir `DELETE /api/admin/appointments/slots?slotKey=...` para materializaciones sin reserva, conservando el `409` con reserva activa.
- [x] 3.6 Agrupar «Reglas publicadas» por duración/servicio/vigencia/estado y mostrar solo horarios manuales en «Horarios individuales».
- [x] 3.7 Actualizar pruebas unitarias del editor, del backend y el E2E de `/admin/citas` para la cuadrícula, el rango y la limpieza.

## 4. Verificación

- [x] 4.1 `npm run typecheck`, `npm run lint` (0 errores, 2 warnings `v-html` previos), `npm test` (323 pruebas) y `npm run build`.
- [x] 4.2 `CI=1 npx playwright test` (94 pruebas E2E).
- [x] 4.3 `npx openspec validate improve-appointment-calendar --strict` (válido con INFO de spec base ausente).
- [x] 4.4 Commitear (`ea8d29a`, `bbec654`), pushear, redesplegar en Netlify y validar `/admin/citas`, `/contacto` y los endpoints en producción: 50 horarios publicados, ninguno a las `00:00`, bundle de la cuadrícula presente y sitemap restaurado.
