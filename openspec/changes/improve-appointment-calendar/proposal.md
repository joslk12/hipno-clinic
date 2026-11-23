# Proposal

## Why

Después de desplegar `add-appointment-calendar` aparecieron tres problemas operativos: el calendario rotula noviembre como diciembre, el editor obliga a crear una regla por día, y desde el panel no se pueden bloquear las horas posteriores a una cita aunque la sesión pueda durar más de lo previsto.

## What Changes

- Corregir el formato de la etiqueta mensual para que el mes se interprete como 1..12 antes de construir la fecha UTC; el calendario público y el del panel deben mostrar el mes en que están.
- Permitir seleccionar varios días de la semana en una sola regla. El panel crea o actualiza una regla por día seleccionado y trata las reglas con igual hora, duración, servicio y vigencia como un grupo editable.
- Hacer clicable el calendario del panel: al elegir un día se muestran todas sus horas (reglas, horarios individuales y citas) con su estado y acciones para bloquear, desbloquear y bloquear un rango desde una hora hasta un límite configurable, creando las horas que aún no existan.

## Capabilities

### Modified Capabilities

- `appointment-scheduling`: el rótulo del mes, la edición multidía de reglas y el bloqueo de horas desde el calendario pasan a formar parte del comportamiento del calendario.

## Impact

- **Frontend**: `src/content/appointments.ts`, `src/components/sections/AppointmentScheduler.vue`, `src/components/admin/AdminAvailabilityEditor.vue` y sus pruebas unitarias; `tests/e2e/admin-appointments.spec.ts`.
- **Backend**: sin cambios. Se reutilizan `POST/PATCH/DELETE /api/admin/appointments/rules` y `PATCH/POST /api/admin/appointments/slots`.
- **Datos**: sin migración. El multi-día se implementa como varias reglas con el mismo `slotKey` pattern por día; los bloqueos usan `schedule_slots` existente.
- **Riesgo**: una operación multidía o de rango puede quedar parcial si una petición falla; el panel muestra el error y recarga el estado real.
