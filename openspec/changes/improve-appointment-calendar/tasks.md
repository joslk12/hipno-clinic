# Tasks

## 1. Etiqueta del mes

- [x] 1.1 Corregir `formatMonthLabel()` en `src/content/appointments.ts` para convertir el mes 1..12 a índice 0..11 antes de `Date.UTC`.
- [x] 1.2 Cubrir noviembre, diciembre y enero en `src/content/__tests__/appointments.spec.ts` y comprobar el caption en `appointment-scheduler.spec.ts`.

## 2. Reglas multidía

- [x] 2.1 Sustituir el selector único por casillas de días en `AdminAvailabilityEditor.vue` y rechazar el guardado sin días.
- [x] 2.2 Crear una regla por día seleccionado y agrupar para edición las reglas con igual hora, duración, servicio y vigencia.
- [x] 2.3 Actualizar las pruebas unitarias del editor y el E2E de `/admin/citas` para los nuevos mensajes y el alta multidía.

## 3. Calendario administrativo editable

- [x] 3.1 Convertir las celdas en botones que seleccionen el día y sincronicen el formulario de horario individual.
- [x] 3.2 Derivar y mostrar las horas del día desde reglas, horarios materializados y citas, con su estado.
- [x] 3.3 Agregar bloqueo/desbloqueo por hora y bloqueo de un rango «desde aquí» con límite configurable, creando los horarios manuales que falten.
- [x] 3.4 Cubrir los tres flujos con pruebas unitarias.

## 4. Verificación

- [x] 4.1 `npm run typecheck`, `npm run lint`, `npm test` (318 pruebas) y `npm run build`.
- [x] 4.2 `CI=1 npx playwright test` (94 pruebas E2E).
- [x] 4.3 `npx openspec validate improve-appointment-calendar --strict`.
