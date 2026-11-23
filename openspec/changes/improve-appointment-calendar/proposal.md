# Proposal

## Why

Después de desplegar `add-appointment-calendar` aparecieron cinco problemas operativos: el calendario rotula noviembre como diciembre, el editor obliga a crear una regla por día, desde el panel no se pueden bloquear las horas posteriores a una cita, aparece un horario fantasma `00:00` en el panel y en el sitio público, y la tabla «Reglas publicadas» crece con una fila por día y hora (8 horas × 5 días = 40 filas).

## What Changes

- Corregir el formato de la etiqueta mensual para que el mes se interprete como 1..12 antes de construir la fecha UTC; el calendario público y el del panel deben mostrar el mes en que están.
- Sustituir el formulario de reglas por una cuadrícula días × horas: marcas celdas `lunes 10:00`, `martes 10:00`, etc., con selección en bloque por fila («Todos») y por columna («Todo»). Un solo guardado aplica el diff: elimina reglas del scope no seleccionadas, actualiza las existentes y crea las nuevas.
- Limitar los horarios de inicio publicables a las `06:00`–`22:00`. Las reglas antiguas fuera de rango (p. ej. `00:00`) no generan horarios reservables, se ocultan de la cuadrícula y del calendario, y se pueden eliminar desde el panel con un botón. El backend rechaza nuevas reglas y horarios manuales fuera de rango con el mensaje `La hora debe estar entre las 06:00 y las 22:00.`
- Agrupar «Reglas publicadas» por duración, servicio, vigencia y estado: un bloque de 40 reglas se resume en una sola fila con los días y las horas; los horarios individuales visibles son solo los creados manualmente.
- Hacer clicable el calendario del panel: al elegir un día se muestran todas sus horas (reglas, horarios individuales y citas) con su estado y acciones para bloquear, desbloquear y bloquear un rango desde una hora hasta un límite configurable, creando las horas que aún no existan. Permitir eliminar materializaciones de reglas sin reserva activa para limpiar horarios fantasma.

## Capabilities

### Modified Capabilities

- `appointment-scheduling`: el rótulo del mes, la cuadrícula días × horas con diff, el rango horario `06:00`–`22:00`, la limpieza de reglas/materializaciones antiguas, la tabla agrupada y el bloqueo de horas desde el calendario pasan a formar parte del comportamiento del calendario.

## Impact

- **Frontend**: `src/types/appointments.ts`, `src/content/appointments.ts`, `src/components/sections/AppointmentScheduler.vue`, `src/components/admin/AdminAvailabilityEditor.vue` y sus pruebas unitarias; `tests/e2e/admin-appointments.spec.ts`.
- **Backend**: `netlify/lib/appointments/{timezone,validation,slots,handlers,store}.ts` y sus pruebas. La validación y `buildSlotCatalog()` filtran horas fuera de rango; `DELETE /api/admin/appointments/slots?slotKey=...` admite materializaciones sin reserva.
- **Datos**: sin migración. El multi-día y la cuadrícula se implementan como varias reglas con `weekday` escalar; los bloqueos usan `schedule_slots` existente. Las filas antiguas con `00:00` se limpian desde el panel o dejan de publicarse.
- **Riesgo**: una operación en bloque o de rango puede quedar parcial si una petición falla; el panel muestra el error y recarga el estado real. Las reglas fuera de rango quedan ocultas hasta que se eliminen explícitamente.
