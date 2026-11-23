# Design

## Context

`add-appointment-calendar` ya está desplegado. No se cambia el contrato de las APIs ni el esquema de Postgres: las reglas siguen teniendo un `weekday` escalar y los bloqueos siguen siendo filas `schedule_slots`.

## Decisions

### 1. Etiqueta del mes

`formatMonthLabel(year, month)` recibe el mes en 1..12 y lo convierte con `Date.UTC(year, month - 1, 1)`. La cuadrícula ya usaba correctamente el mes 1-based para calcular días, así que no se toca. Se cubre con tests del helper y del caption del calendario público.

### 2. Reglas multidía por fan-out en el panel

El formulario usa casillas para varios días. Al crear, se envía un `POST` por día. Al editar, se agrupan las reglas existentes con igual hora, duración, servicio y vigencia; se actualizan las que conservan su día, se eliminan las que se quitaron y se crean las nuevas. No se añade `weekdays[]` al contrato ni una columna `smallint[]`: evita una migración de datos en producción y mantiene la validación de solapamiento del backend. Si una petición falla, se muestra el error y se recarga el estado real.

### 3. Calendario administrativo editable

Las celdas del calendario son botones que seleccionan un día y sincronizan el formulario de horario individual. El panel deriva las horas del día de las reglas vigentes, los `schedule_slots` y las citas reservadas, mostrando `Disponible`, `Reservado` o `Bloqueado`. Cada hora permite alternar el bloqueo con `PATCH /api/admin/appointments/slots?slotKey=...`. «BLOQUEAR DESDE AQUÍ» bloquea desde la hora elegida hasta un límite configurable (por defecto 20:00), usando la duración de esa hora como paso; si la hora intermedia no existe, primero la crea como horario manual. Esto permite cerrar 11:00 en adelante cuando una sesión de 10:00 se extiende.

## Alternatives considered

- Cambiar `AvailabilityRule.weekday` por `weekdays[]` y migrar la columna a `smallint[]`: más atómico, pero rompe el contrato de las Functions y exige migración con datos reales.
- Bloquear automáticamente las horas posteriores al reservar: cambiaría la semántica de la reserva atómica y no refleja que la duración real solo la conoce el terapeuta. Se prefiere el bloqueo manual explícito.

## Risks

- Operaciones parciales ante fallos de red en fan-out o en rangos largos; mitigado mostrando el error y recargando desde la API.
- Crear horarios manuales bloqueados incrementa filas en `schedule_slots`; son editables y se pueden eliminar desde el propio panel.
